using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace backend.Services;

public sealed class InspectFloatQueue : IDisposable
{
    private readonly ConcurrentQueue<InspectJob> _queue = new();
    private readonly SemaphoreSlim _queueSignal = new(0);
    private readonly CancellationTokenSource _cts = new();
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDbContextFactory<ApplicationDbContext> _dbContextFactory;
    private readonly ILogger<InspectFloatQueue> _logger;
    private readonly ConcurrentDictionary<string, byte> _dedupe = new(StringComparer.Ordinal);
    private readonly Task? _processingTask;
    private readonly bool _enabled;
    private InspectJob? _currentJob;
    private DateTimeOffset? _currentJobStarted;
    private const int MaxRetries = 5;
    private static readonly TimeSpan BaseRequestInterval = TimeSpan.FromSeconds(12);
    private static readonly TimeSpan RequestSpacing = TimeSpan.FromMilliseconds(250);
    private static readonly TimeSpan RetryBaseDelay = TimeSpan.FromSeconds(2);
    private DateTimeOffset _nextAllowedRequest = DateTimeOffset.UtcNow;
    private DateTimeOffset? _rateLimitUntil;
    private string? _lastStatusMessage;
    private static readonly Regex InspectLinkRegex = new(
        @"^steam://rungame/730/76561202255233023/\+csgo_econ_action_preview%20S(?<owner>\d+)A(?<asset>\d+)D(?<d>\d+)$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public InspectFloatQueue(
        IHttpClientFactory httpClientFactory,
        IDbContextFactory<ApplicationDbContext> dbContextFactory,
        ILogger<InspectFloatQueue> logger,
        bool enableProcessing = true)
    {
        _httpClientFactory = httpClientFactory;
        _dbContextFactory = dbContextFactory;
        _logger = logger;
        _enabled = enableProcessing;
        if (_enabled)
        {
            _processingTask = Task.Run(ProcessQueueAsync, CancellationToken.None);
        }
    }

    public void Enqueue(InspectJob job)
    {
        if (!_enabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(job.InspectLink))
        {
            return;
        }

        if (_dedupe.TryAdd(job.UniqueKey, 0))
        {
            _queue.Enqueue(job);
            _queueSignal.Release();
            _logger.LogDebug("Queued inspect job for asset {AssetId}", job.AssetId);
        }
        else
        {
            _logger.LogDebug("Inspect job for asset {AssetId} already queued, skipping duplicate", job.AssetId);
        }
    }

    private async Task ProcessQueueAsync()
    {
        while (!_cts.IsCancellationRequested)
        {
            try
            {
                await _queueSignal.WaitAsync(_cts.Token);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            if (!_queue.TryDequeue(out var job))
            {
                continue;
            }

            _currentJob = job;
            _currentJobStarted = DateTimeOffset.UtcNow;

            _dedupe.TryRemove(job.UniqueKey, out _);

            try
            {
                await ProcessJobAsync(job, _cts.Token);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed processing inspect job for asset {AssetId}", job.AssetId);
            }
            finally
            {
                _currentJob = null;
                _currentJobStarted = null;
            }

            try
            {
                await Task.Delay(RequestSpacing, _cts.Token);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task ProcessJobAsync(InspectJob job, CancellationToken cancellationToken)
    {
        var result = await FetchInspectDataAsync(job.InspectLink!, cancellationToken);
        if (result.FloatValue is null)
        {
            _logger.LogDebug("Inspect data unavailable for asset {AssetId}, skipping update", job.AssetId);
            return;
        }

        await using var context = await _dbContextFactory.CreateDbContextAsync(cancellationToken);

        var inventoryItem = await context.InventoryItems
            .Include(i => i.Skin)
            .FirstOrDefaultAsync(i => i.AssetId == job.AssetId && i.UserId == job.UserId, cancellationToken);

        if (inventoryItem is null)
        {
            _logger.LogDebug("Inventory item {AssetId} no longer exists, skipping inspect update", job.AssetId);
            return;
        }

        inventoryItem.Float = Math.Round(result.FloatValue.Value, 6, MidpointRounding.AwayFromZero);
        inventoryItem.Exterior = MapExterior(inventoryItem.Float);
        inventoryItem.PaintSeed = result.PaintSeed;

        await context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Updated float via inspect for {MarketHashName} ({AssetId}) -> {Float}",
            inventoryItem.SteamMarketHashName ?? inventoryItem.Skin?.MarketHashName ?? job.MarketHashName ?? job.Name,
            job.AssetId,
            inventoryItem.Float);
    }

    private async Task<(double? FloatValue, int? PaintSeed, int? PaintIndex)> FetchInspectDataAsync(
        string inspectLink,
        CancellationToken cancellationToken)
    {
        if (!TryValidateInspectLink(inspectLink, out _))
        {
            _logger.LogWarning("Rejected inspect link {InspectLink} due to invalid format", inspectLink);
            _lastStatusMessage = "Invalid inspect link format";
            InspectQueueMetrics.RecordInvalidLink();
            return (null, null, null);
        }

        InspectQueueMetrics.RecordAttempt();

        var client = _httpClientFactory.CreateClient("csgoFloat");
        client.Timeout = TimeSpan.FromSeconds(15);

        var requestUri = $"https://api.csgofloat.com/?url={Uri.EscapeDataString(inspectLink)}";

        for (var attempt = 1; attempt <= MaxRetries && !cancellationToken.IsCancellationRequested; attempt++)
        {
            await DelayUntilAllowedAsync(cancellationToken);

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
                request.Headers.TryAddWithoutValidation("User-Agent", "csinvtracker/1.0 (+https://csinvtracker.com)");

                using var response = await client.SendAsync(request, cancellationToken);
                _nextAllowedRequest = DateTimeOffset.UtcNow + BaseRequestInterval;
                _rateLimitUntil = null;
                _lastStatusMessage = null;

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    var retryDelay = ExtractRetryDelay(response) ?? BaseRequestInterval;
                    InspectQueueMetrics.RecordRateLimitHit();
                    _rateLimitUntil = DateTimeOffset.UtcNow + retryDelay;
                    _lastStatusMessage = "CSGOFloat API rate limited";
                    _logger.LogWarning(
                        "CSGOFloat API rate limit hit for {InspectLink}. Retry-After: {RetryAfter}",
                        inspectLink,
                        response.Headers.RetryAfter?.Delta ?? retryDelay);
                    return (null, null, null);
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "CSGOFloat API returned {StatusCode} for inspect link {InspectLink}",
                        response.StatusCode,
                        inspectLink);
                    InspectQueueMetrics.RecordFailure();
                    return (null, null, null);
                }

                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

                if (!document.RootElement.TryGetProperty("iteminfo", out var itemInfo))
                {
                    _logger.LogWarning("CSGOFloat API payload missing iteminfo for inspect link {InspectLink}", inspectLink);
                    InspectQueueMetrics.RecordFailure();
                    return (null, null, null);
                }

                double? floatValue = null;
                if (itemInfo.TryGetProperty("floatvalue", out var floatElement))
                {
                    if (floatElement.ValueKind == JsonValueKind.Number)
                    {
                        floatValue = floatElement.GetDouble();
                    }
                    else if (floatElement.ValueKind == JsonValueKind.String &&
                             double.TryParse(floatElement.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedFloat))
                    {
                        floatValue = parsedFloat;
                    }
                }

                int? paintSeed = null;
                if (itemInfo.TryGetProperty("paintseed", out var paintSeedElement) &&
                    paintSeedElement.ValueKind == JsonValueKind.Number)
                {
                    paintSeed = paintSeedElement.GetInt32();
                }

                int? paintIndex = null;
                if (itemInfo.TryGetProperty("paintindex", out var paintIndexElement) &&
                    paintIndexElement.ValueKind == JsonValueKind.Number)
                {
                    paintIndex = paintIndexElement.GetInt32();
                }

                InspectQueueMetrics.RecordSuccess();
                return (floatValue, paintSeed, paintIndex);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("CSGOFloat request timed out for inspect link {InspectLink}", inspectLink);
                var timeoutDelay = TimeSpan.FromSeconds(Math.Pow(RetryBaseDelay.TotalSeconds, attempt));
                if (timeoutDelay < BaseRequestInterval)
                {
                    timeoutDelay = BaseRequestInterval;
                }
                _nextAllowedRequest = DateTimeOffset.UtcNow + timeoutDelay;
                _rateLimitUntil = _nextAllowedRequest;
                _lastStatusMessage = $"Inspect request timed out; retrying in {timeoutDelay.TotalSeconds:0}s (attempt {attempt}/{MaxRetries})";
                InspectQueueMetrics.RecordFailure();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "CSGOFloat request failed for inspect link {InspectLink}", inspectLink);
                var errorDelay = TimeSpan.FromSeconds(Math.Pow(RetryBaseDelay.TotalSeconds, attempt));
                if (errorDelay < BaseRequestInterval)
                {
                    errorDelay = BaseRequestInterval;
                }
                _nextAllowedRequest = DateTimeOffset.UtcNow + errorDelay;
                _rateLimitUntil = _nextAllowedRequest;
                _lastStatusMessage = $"Inspect request failed; retrying in {errorDelay.TotalSeconds:0}s (attempt {attempt}/{MaxRetries})";
                InspectQueueMetrics.RecordFailure();
            }

            var backoffDelay = TimeSpan.FromSeconds(Math.Pow(RetryBaseDelay.TotalSeconds, attempt));
            if (backoffDelay < BaseRequestInterval)
            {
                backoffDelay = BaseRequestInterval;
            }
            _nextAllowedRequest = DateTimeOffset.UtcNow + backoffDelay;
            _rateLimitUntil = _nextAllowedRequest;
            _lastStatusMessage = $"Retrying inspect fetch in {backoffDelay.TotalSeconds:0}s (attempt {attempt + 1}/{MaxRetries})";
        }

        _lastStatusMessage = $"Unable to retrieve float after {MaxRetries} attempts.";
        InspectQueueMetrics.RecordFailure();
        return (null, null, null);
    }

    public async Task<(bool Success, string? ErrorMessage)> ProcessJobImmediateAsync(InspectJob job, CancellationToken cancellationToken)
    {
        if (!TryValidateInspectLink(job.InspectLink, out _))
        {
            InspectQueueMetrics.RecordInvalidLink();
            return (false, "Inspect link failed validation");
        }

        try
        {
            await ProcessJobAsync(job, cancellationToken);
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Immediate inspect processing failed for {AssetId}", job.AssetId);
            InspectQueueMetrics.RecordFailure();
            return (false, ex.Message);
        }
    }

    private async Task DelayUntilAllowedAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var wait = _nextAllowedRequest - now;
        if (wait <= TimeSpan.Zero)
        {
            return;
        }

        _rateLimitUntil = _nextAllowedRequest;
        _logger.LogDebug("Local throttle delaying inspect request by {Delay}s", wait.TotalSeconds.ToString("0.###"));
        try
        {
            await Task.Delay(wait, cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            // allow loop to observe cancellation
        }
        finally
        {
            if (_rateLimitUntil.HasValue && DateTimeOffset.UtcNow >= _rateLimitUntil.Value)
            {
                _rateLimitUntil = null;
            }
        }
    }

    private static TimeSpan? ExtractRetryDelay(HttpResponseMessage response)
    {
        if (response.Headers.RetryAfter is { } retryAfter)
        {
            if (retryAfter.Delta.HasValue)
            {
                return retryAfter.Delta.Value;
            }

            if (retryAfter.Date.HasValue)
            {
                var delta = retryAfter.Date.Value - DateTimeOffset.UtcNow;
                if (delta > TimeSpan.Zero)
                {
                    return delta;
                }
            }
        }

        return null;
    }

    private static string MapExterior(double floatValue)
    {
        return floatValue switch
        {
            < 0.07 => "Factory New",
            < 0.15 => "Minimal Wear",
            < 0.38 => "Field-Tested",
            < 0.45 => "Well-Worn",
            _ => "Battle-Scarred"
        };
    }

    public void Dispose()
    {
        _cts.Cancel();
        if (_enabled && _processingTask is not null)
        {
            try
            {
                _processingTask.Wait(TimeSpan.FromSeconds(5));
            }
            catch
            {
                // Ignore shutdown exceptions
            }
        }
        _cts.Dispose();
        _queueSignal.Dispose();
    }

    public InspectQueueStatus GetStatus()
    {
        if (!_enabled)
        {
            var emptyMetrics = InspectQueueMetrics.GetSnapshot();
            return new InspectQueueStatus(false, 0, null, null, null, null, null, false, null, null,
                emptyMetrics.TotalAttempts, emptyMetrics.Successes, emptyMetrics.RateLimitHits, emptyMetrics.InvalidLinks, emptyMetrics.Failures);
        }

        var job = _currentJob;
        var pending = _queue.Count;
        if (job is not null)
        {
            pending += 1;
        }

        var waiting = _rateLimitUntil.HasValue && _rateLimitUntil.Value > DateTimeOffset.UtcNow;
        var metrics = InspectQueueMetrics.GetSnapshot();

        return new InspectQueueStatus(
            job is not null,
            pending,
            job?.InventoryItemId,
            job?.AssetId,
            job?.MarketHashName,
            job?.Name,
            _currentJobStarted,
            waiting,
            waiting ? _rateLimitUntil : null,
            _lastStatusMessage,
            metrics.TotalAttempts,
            metrics.Successes,
            metrics.RateLimitHits,
            metrics.InvalidLinks,
            metrics.Failures);
    }

    public static bool IsInspectLinkFormatValid(string? inspectLink) =>
        !string.IsNullOrWhiteSpace(inspectLink) && InspectLinkRegex.IsMatch(inspectLink);

    private bool TryValidateInspectLink(string? inspectLink, out Match match)
    {
        match = Match.Empty;

        if (string.IsNullOrWhiteSpace(inspectLink))
        {
            _logger.LogWarning("Inspect link is null or empty");
            return false;
        }

        match = InspectLinkRegex.Match(inspectLink);
        if (!match.Success)
        {
            _logger.LogWarning(
                "Invalid inspect link format. Expected S<owner> A<asset> D<d>. Got: {Link}",
                inspectLink);
            return false;
        }

        _logger.LogDebug(
            "Valid inspect link - Owner: {Owner}, Asset: {Asset}, D: {D}",
            match.Groups["owner"].Value,
            match.Groups["asset"].Value,
            match.Groups["d"].Value);
        return true;
    }

    private static class InspectQueueMetrics
    {
        private static long _totalAttempts;
        private static long _successes;
        private static long _rateLimitHits;
        private static long _invalidLinks;
        private static long _failures;

        public static void RecordAttempt() => Interlocked.Increment(ref _totalAttempts);
        public static void RecordSuccess() => Interlocked.Increment(ref _successes);
        public static void RecordRateLimitHit() => Interlocked.Increment(ref _rateLimitHits);
        public static void RecordInvalidLink() => Interlocked.Increment(ref _invalidLinks);
        public static void RecordFailure() => Interlocked.Increment(ref _failures);

        public static InspectMetricsSnapshot GetSnapshot() =>
            new(
                Interlocked.Read(ref _totalAttempts),
                Interlocked.Read(ref _successes),
                Interlocked.Read(ref _rateLimitHits),
                Interlocked.Read(ref _invalidLinks),
                Interlocked.Read(ref _failures));

        internal readonly record struct InspectMetricsSnapshot(
            long TotalAttempts,
            long Successes,
            long RateLimitHits,
            long InvalidLinks,
            long Failures);
    }
}

public record InspectJob(
    int UserId,
    int InventoryItemId,
    string AssetId,
    string? InspectLink,
    string? MarketHashName,
    string? Name)
{
    public string UniqueKey => $"{UserId}:{AssetId}";
}

public record InspectQueueStatus(
    bool IsProcessing,
    int Pending,
    int? CurrentInventoryItemId,
    string? CurrentAssetId,
    string? CurrentMarketHashName,
    string? CurrentName,
    DateTimeOffset? StartedAt,
    bool WaitingForRateLimit,
    DateTimeOffset? RateLimitUntil,
    string? LastStatusMessage,
    long TotalAttempts,
    long Successes,
    long RateLimitHits,
    long InvalidLinks,
    long Failures);

