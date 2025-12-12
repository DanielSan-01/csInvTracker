using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Text.Json;
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
    private const int MaxRetries = 5;
    private static readonly TimeSpan RequestSpacing = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan RetryBaseDelay = TimeSpan.FromSeconds(2);

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

            _dedupe.TryRemove(job.UniqueKey, out _);

            try
            {
                await ProcessJobAsync(job, _cts.Token);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed processing inspect job for asset {AssetId}", job.AssetId);
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
        var client = _httpClientFactory.CreateClient("csgoFloat");
        client.Timeout = TimeSpan.FromSeconds(15);

        var requestUri = $"https://api.csgofloat.com/?url={Uri.EscapeDataString(inspectLink)}";

        for (var attempt = 1; attempt <= MaxRetries && !cancellationToken.IsCancellationRequested; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
                request.Headers.TryAddWithoutValidation("User-Agent", "csinvtracker/1.0 (+https://csinvtracker.com)");

                using var response = await client.SendAsync(request, cancellationToken);

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    var delay = ExtractRetryDelay(response) ?? TimeSpan.FromSeconds(Math.Pow(RetryBaseDelay.TotalSeconds, attempt));
                    _logger.LogWarning(
                        "CSGOFloat rate limit hit for {InspectLink}. Waiting {Delay}s before retry {Attempt}/{MaxAttempts}",
                        inspectLink,
                        delay.TotalSeconds.ToString("0.###"),
                        attempt,
                        MaxRetries);
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "CSGOFloat API returned {StatusCode} for inspect link {InspectLink}",
                        response.StatusCode,
                        inspectLink);
                    return (null, null, null);
                }

                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

                if (!document.RootElement.TryGetProperty("iteminfo", out var itemInfo))
                {
                    _logger.LogWarning("CSGOFloat API payload missing iteminfo for inspect link {InspectLink}", inspectLink);
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

                return (floatValue, paintSeed, paintIndex);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("CSGOFloat request timed out for inspect link {InspectLink}", inspectLink);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "CSGOFloat request failed for inspect link {InspectLink}", inspectLink);
            }

            var backoffDelay = TimeSpan.FromSeconds(Math.Pow(RetryBaseDelay.TotalSeconds, attempt));
            await Task.Delay(backoffDelay, cancellationToken);
        }

        return (null, null, null);
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
}

public record InspectJob(
    int UserId,
    string AssetId,
    string? InspectLink,
    string? MarketHashName,
    string? Name)
{
    public string UniqueKey => $"{UserId}:{AssetId}";
}

