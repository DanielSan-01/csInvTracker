using System.Net;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Xml;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace backend.Services;

/// <summary>
/// Lightweight HTTP client for CSMarketAPI used to fetch market prices.
/// </summary>
public class CsMarketApiService
{
    private const int MaxRateLimitRetries = 5;
    private static readonly TimeSpan InitialRateLimitDelay = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan MaxRateLimitDelay = TimeSpan.FromSeconds(15);

    private static readonly Uri BaseUri = new("https://api.csmarketapi.com");
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CsMarketApiService> _logger;
    private readonly string _apiKey;
    private readonly string _currency;
    private readonly string[] _defaultMarkets;
    private readonly int? _maxAgeSeconds;
    private readonly TimeSpan _cacheDurationSuccess;
    private readonly TimeSpan _cacheDurationNoData;
    private bool _encounteredRateLimit;
    private readonly List<string> _rateLimitMessages = new();
    private const string DebugLogPath = "/Users/danielostensen/commonplace/csInvTracker/.cursor/debug.log";
    private static readonly object DebugLogLock = new();

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);
    public bool EncounteredRateLimit => _encounteredRateLimit;
    public IReadOnlyList<string> RateLimitMessages => _rateLimitMessages;

    public CsMarketApiService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<CsMarketApiService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _logger = logger;

        var configuredKey = configuration["CsMarket:ApiKey"];
        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            configuredKey = Environment.GetEnvironmentVariable("CSMARKET_API_KEY");
            if (string.IsNullOrWhiteSpace(configuredKey))
            {
                _logger.LogWarning("CSMarket API key not found in configuration or environment variables.");
            }
            else
            {
                var preview = configuredKey.Length > 4 ? configuredKey[..4] + "****" : "****";
                _logger.LogInformation("CSMarket API key loaded from environment. Length: {Length}, Preview: {Preview}", configuredKey.Length, preview);
            }
        }
        else
        {
            var preview = configuredKey.Length > 4 ? configuredKey[..4] + "****" : "****";
            _logger.LogInformation("CSMarket API key loaded from configuration. Length: {Length}, Preview: {Preview}", configuredKey.Length, preview);
        }

        _apiKey = configuredKey?.Trim() ?? string.Empty;

        _currency = string.IsNullOrWhiteSpace(configuration["CsMarket:Currency"])
            ? "USD"
            : configuration["CsMarket:Currency"]!.Trim().ToUpperInvariant();

        var marketsSetting = configuration["CsMarket:Markets"]
            ?? Environment.GetEnvironmentVariable("CSMARKET_MARKETS");

        _defaultMarkets = string.IsNullOrWhiteSpace(marketsSetting)
            ? Array.Empty<string>()
            : marketsSetting.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(m => m.ToUpperInvariant())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

        if (int.TryParse(configuration["CsMarket:MaxAgeSeconds"], out var maxAgeSeconds) && maxAgeSeconds > 0)
        {
            _maxAgeSeconds = maxAgeSeconds;
        }

        var successCacheSeconds = configuration.GetValue<int?>("CsMarket:CacheSuccessSeconds");
        var noDataCacheSeconds = configuration.GetValue<int?>("CsMarket:CacheNoDataSeconds");

        _cacheDurationSuccess = successCacheSeconds.HasValue && successCacheSeconds.Value > 0
            ? TimeSpan.FromSeconds(successCacheSeconds.Value)
            : TimeSpan.FromMinutes(15);

        _cacheDurationNoData = noDataCacheSeconds.HasValue && noDataCacheSeconds.Value > 0
            ? TimeSpan.FromSeconds(noDataCacheSeconds.Value)
            : TimeSpan.FromMinutes(5);
    }

    /// <summary>
    /// Gets a best-effort market price for the given market hash name using CSMarketAPI data.
    /// </summary>
    public async Task<decimal?> GetBestListingPriceAsync(
        string marketHashName,
        IEnumerable<string>? markets = null,
        bool preserveRateLimitState = false,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(marketHashName))
        {
            return null;
        }

        var normalizedHash = marketHashName.Trim();
        var cacheKey = BuildCacheKey(normalizedHash, markets);

        if (!preserveRateLimitState)
        {
            _encounteredRateLimit = false;
            _rateLimitMessages.Clear();
        }

        if (_cache.TryGetValue<CachedPriceEntry>(cacheKey, out var cached) &&
            cached is not null)
        {
            _logger.LogDebug("CSMarket cache hit for {MarketHashName}", normalizedHash);
#region agent log
            DebugLog(
                hypothesisId: "H3",
                location: "CsMarketApiService.GetBestListingPriceAsync",
                message: "Cache hit",
                data: new
                {
                    marketHashName = normalizedHash,
                    cacheKey,
                    cachedPrice = cached.Price
                });
#endregion
            return cached.Price;
        }

        var listingData = await GetListingsLatestAggregatedAsync(normalizedHash, markets, cancellationToken);
        var listingPrice = ExtractBestPrice(listingData);

        if (listingPrice.HasValue)
        {
            _logger.LogInformation(
                "CSMarket price resolved from live listings for {MarketHashName}: {Price}",
                normalizedHash,
                listingPrice.Value);
            CachePrice(cacheKey, listingPrice.Value);
            return listingPrice;
        }

        var salesData = await GetSalesLatestAggregatedAsync(normalizedHash, markets, cancellationToken);
        var fallbackPrice = ExtractBestSalesPrice(salesData);

        if (fallbackPrice.HasValue)
        {
            _logger.LogInformation(
                "CSMarket price resolved from sales fallback for {MarketHashName}: {Price}",
                normalizedHash,
                fallbackPrice.Value);
            CachePrice(cacheKey, fallbackPrice.Value);
        }
        else
        {
            _logger.LogInformation(
                "CSMarket returned no pricing data for {MarketHashName}",
                normalizedHash);
            CachePrice(cacheKey, null);
        }

#region agent log
        DebugLog(
            hypothesisId: "H3",
            location: "CsMarketApiService.GetBestListingPriceAsync",
            message: "CSMarket lookup completed",
            data: new
            {
                marketHashName = normalizedHash,
                cacheKey,
                markets = markets?.ToArray(),
                listingPrice,
                fallbackPrice,
                cached = false
            });
#endregion

        return fallbackPrice;
    }

    /// <summary>
    /// Fetches prices for a list of market hash names sequentially to respect API limits.
    /// </summary>
    public async Task<Dictionary<string, decimal?>> GetBestListingPricesAsync(
        IEnumerable<string> marketHashNames,
        IEnumerable<string>? markets = null,
        int delayMs = 200,
        CancellationToken cancellationToken = default)
    {
        _encounteredRateLimit = false;
        _rateLimitMessages.Clear();

        var results = new Dictionary<string, decimal?>(StringComparer.OrdinalIgnoreCase);

        foreach (var hash in marketHashNames)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            if (string.IsNullOrWhiteSpace(hash))
            {
                continue;
            }

            var trimmed = hash.Trim();
            var price = await GetBestListingPriceAsync(
                trimmed,
                markets,
                preserveRateLimitState: true,
                cancellationToken: cancellationToken);
            results[trimmed] = price;

            if (delayMs > 0)
            {
                try
                {
                    await Task.Delay(delayMs, cancellationToken);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }
        }

        return results;
    }

    private static void DebugLog(string hypothesisId, string location, string message, object data)
    {
        try
        {
            var directory = Path.GetDirectoryName(DebugLogPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var payload = new
            {
                sessionId = "debug-session",
                runId = "pre-fix",
                hypothesisId,
                location,
                message,
                data,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };
            var json = JsonSerializer.Serialize(payload);
            lock (DebugLogLock)
            {
                File.AppendAllText(DebugLogPath, json + Environment.NewLine);
            }
        }
        catch
        {
            // Swallow instrumentation errors
        }
    }

    private async Task<ListingsLatestAggregatedResponse?> GetListingsLatestAggregatedAsync(
        string marketHashName,
        IEnumerable<string>? markets,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(marketHashName))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogWarning("CSMarket API key is not configured. Cannot fetch market data for {MarketHashName}.", marketHashName);
            return null;
        }

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(15);

            var requestUri = BuildRequestUri(
                "/v1/listings/latest/aggregate",
                marketHashName,
                markets);

            _logger.LogDebug("Fetching CSMarket price for {MarketHashName} using {Uri}", marketHashName, requestUri);

            var response = await SendWithRetriesAsync(
                httpClient,
                requestUri,
                marketHashName,
                "listings/latest/aggregate",
                cancellationToken);

            if (response == null)
            {
                return null;
            }

            using (response)
            {
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(cancellationToken);
                    if (response.StatusCode == HttpStatusCode.NotFound)
                    {
                        _logger.LogDebug(
                            "CSMarket API returned 404 (no listings) for {MarketHashName}. Response: {Body}",
                            marketHashName,
                            body.Length > 300 ? body[..300] : body);
                    }
                    else
                    {
                        _logger.LogWarning(
                            "CSMarket API returned {StatusCode} for {MarketHashName}. Response: {Body}",
                            response.StatusCode,
                            marketHashName,
                            body.Length > 300 ? body[..300] : body);
                    }

                    return null;
                }

                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                return await JsonSerializer.DeserializeAsync<ListingsLatestAggregatedResponse>(
                    stream,
                    JsonOptions,
                    cancellationToken);
            }
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "CSMarket request timed out for {MarketHashName}", marketHashName);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch CSMarket data for {MarketHashName}", marketHashName);
            return null;
        }
    }

    private async Task<SalesLatestAggregatedResponse?> GetSalesLatestAggregatedAsync(
        string marketHashName,
        IEnumerable<string>? markets,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(marketHashName))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return null;
        }

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(15);

            var requestUri = BuildRequestUri(
                "/v1/sales/latest/aggregate",
                marketHashName,
                markets);

            var response = await SendWithRetriesAsync(
                httpClient,
                requestUri,
                marketHashName,
                "sales/latest/aggregate",
                cancellationToken);

            if (response == null)
            {
                return null;
            }

            using (response)
            {
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync(cancellationToken);
                    if (response.StatusCode == HttpStatusCode.NotFound)
                    {
                        _logger.LogDebug(
                            "CSMarket sales API returned 404 (no sales) for {MarketHashName}. Response: {Body}",
                            marketHashName,
                            body.Length > 300 ? body[..300] : body);
                    }
                    else
                    {
                        _logger.LogWarning(
                            "CSMarket sales API returned {StatusCode} for {MarketHashName}. Response: {Body}",
                            response.StatusCode,
                            marketHashName,
                            body.Length > 300 ? body[..300] : body);
                    }

                    return null;
                }

                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                return await JsonSerializer.DeserializeAsync<SalesLatestAggregatedResponse>(
                    stream,
                    JsonOptions,
                    cancellationToken);
            }
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "CSMarket sales request timed out for {MarketHashName}", marketHashName);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch CSMarket sales data for {MarketHashName}", marketHashName);
            return null;
        }
    }

    private string[] ResolveTargetMarkets(IEnumerable<string>? markets)
    {
        var providedMarkets = markets?
            .Where(m => !string.IsNullOrWhiteSpace(m))
            .Select(m => m.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(m => m, StringComparer.Ordinal)
            .ToArray();

        return providedMarkets is { Length: > 0 }
            ? providedMarkets
            : _defaultMarkets;
    }

    private string BuildCacheKey(string marketHashName, IEnumerable<string>? markets)
    {
        var targetMarkets = ResolveTargetMarkets(markets);
        var marketsKey = targetMarkets.Length > 0 ? string.Join(',', targetMarkets) : "ALL";
        var maxAgeKey = _maxAgeSeconds.HasValue ? _maxAgeSeconds.Value.ToString() : "DEFAULT";
        return $"csmarket::{_currency}::{marketsKey}::{maxAgeKey}::{marketHashName.ToUpperInvariant()}";
    }

    private void CachePrice(string cacheKey, decimal? price)
    {
        var duration = price.HasValue ? _cacheDurationSuccess : _cacheDurationNoData;
        if (duration <= TimeSpan.Zero)
        {
            return;
        }

        _cache.Set(cacheKey, new CachedPriceEntry { Price = price }, duration);
    }

    private Uri BuildRequestUri(string path, string marketHashName, IEnumerable<string>? markets)
    {
        var uri = new Uri(BaseUri, path);
        var builder = new UriBuilder(uri);

        var query = new List<string>
        {
            BuildQueryParameter("key", _apiKey),
            BuildQueryParameter("market_hash_name", marketHashName),
            BuildQueryParameter("currency", _currency)
        };

        var targetMarkets = ResolveTargetMarkets(markets);

        foreach (var market in targetMarkets)
        {
            if (!string.IsNullOrWhiteSpace(market))
            {
                query.Add(BuildQueryParameter("markets", market));
            }
        }

        var maxAgeValue = FormatDurationSeconds(_maxAgeSeconds);
        if (!string.IsNullOrWhiteSpace(maxAgeValue))
        {
            query.Add(BuildQueryParameter("max_age", maxAgeValue));
        }

        builder.Query = string.Join("&", query);
        return builder.Uri;
    }

    private static string BuildQueryParameter(string name, string value)
    {
        var encoded = Uri.EscapeDataString(value);
        return $"{Uri.EscapeDataString(name)}={encoded}";
    }

    private static string? FormatDurationSeconds(int? seconds)
    {
        if (!seconds.HasValue || seconds.Value <= 0)
        {
            return null;
        }

        var timespan = TimeSpan.FromSeconds(seconds.Value);
        return XmlConvert.ToString(timespan);
    }

    private static decimal? ExtractBestSalesPrice(SalesLatestAggregatedResponse? data)
    {
        if (data?.Sales == null || data.Sales.Count == 0)
        {
            return null;
        }

        var candidates = data.Sales
            .Select(sale =>
                sale.MedianPrice
                ?? sale.MeanPrice
                ?? sale.MinPrice
                ?? sale.MaxPrice)
            .Where(price => price.HasValue && price.Value > 0)
            .Select(price => price!.Value)
            .ToList();

        if (candidates.Count == 0)
        {
            return null;
        }

        return candidates.Min();
    }

    private static decimal? ExtractBestPrice(ListingsLatestAggregatedResponse? data)
    {
        if (data?.Listings == null || data.Listings.Count == 0)
        {
            return null;
        }

        var candidates = data.Listings
            .Select(listing =>
                listing.MinPrice
                ?? listing.MedianPrice
                ?? listing.MeanPrice
                ?? listing.MaxPrice)
            .Where(price => price.HasValue && price.Value > 0)
            .Select(price => price!.Value)
            .ToList();

        if (candidates.Count == 0)
        {
            return null;
        }

        return candidates.Min();
    }

    private async Task<HttpResponseMessage?> SendWithRetriesAsync(
        HttpClient client,
        Uri requestUri,
        string marketHashName,
        string endpointName,
        CancellationToken cancellationToken)
    {
        var backoff = InitialRateLimitDelay;

        for (var attempt = 0; attempt < MaxRateLimitRetries; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var response = await client.GetAsync(requestUri, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return response;
            }

            if ((int)response.StatusCode == 429)
            {
                var retryDelay = await HandleRateLimitAsync(
                    response,
                    marketHashName,
                    endpointName,
                    backoff,
                    attempt,
                    cancellationToken);

                if (retryDelay == null)
                {
                    return null;
                }

                backoff = TimeSpan.FromMilliseconds(Math.Min(backoff.TotalMilliseconds * 2, MaxRateLimitDelay.TotalMilliseconds));

                try
                {
                    await Task.Delay(retryDelay.Value, cancellationToken);
                }
                catch (TaskCanceledException)
                {
                    throw;
                }

                continue;
            }

            return response;
        }

        _logger.LogWarning(
            "CSMarket {Endpoint} rate limit exhausted for {MarketHashName} after {Attempts} retries",
            endpointName,
            marketHashName,
            MaxRateLimitRetries);

        return null;
    }

    private async Task<TimeSpan?> HandleRateLimitAsync(
        HttpResponseMessage response,
        string marketHashName,
        string endpointName,
        TimeSpan backoff,
        int attempt,
        CancellationToken cancellationToken)
    {
        _encounteredRateLimit = true;

        var retryDelay = GetRetryAfterDelay(response) ?? backoff;
        if (retryDelay <= TimeSpan.Zero)
        {
            retryDelay = TimeSpan.FromMilliseconds(250);
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var truncatedBody = body.Length > 300 ? body[..300] : body;

        if (_rateLimitMessages.Count < 20)
        {
            _rateLimitMessages.Add(
                $"Rate limit hit on {endpointName} for '{marketHashName}'. Retrying in {retryDelay}. Response: {truncatedBody}");
        }

        _logger.LogWarning(
            "CSMarket {Endpoint} rate limited for {MarketHashName} (attempt {Attempt}/{Max}). Waiting {Delay} before retry. Response: {Body}",
            endpointName,
            marketHashName,
            attempt + 1,
            MaxRateLimitRetries,
            retryDelay,
            truncatedBody);

        response.Dispose();

        if (attempt >= MaxRateLimitRetries - 1)
        {
            return null;
        }

        return retryDelay;
    }

    private static TimeSpan? GetRetryAfterDelay(HttpResponseMessage response)
    {
        if (response.Headers.RetryAfter != null)
        {
            if (response.Headers.RetryAfter.Delta.HasValue)
            {
                return response.Headers.RetryAfter.Delta.Value;
            }

            if (response.Headers.RetryAfter.Date.HasValue)
            {
                var delta = response.Headers.RetryAfter.Date.Value - DateTimeOffset.UtcNow;
                if (delta > TimeSpan.Zero)
                {
                    return delta;
                }
            }
        }

        if (response.Headers.TryGetValues("X-RateLimit-Reset", out var resetValues))
        {
            var first = resetValues.FirstOrDefault();
            if (first != null && long.TryParse(first, out var unixSeconds))
            {
                var epoch = DateTimeOffset.FromUnixTimeSeconds(unixSeconds);
                var delta = epoch - DateTimeOffset.UtcNow;
                if (delta > TimeSpan.Zero)
                {
                    return delta;
                }
            }
        }

        return null;
    }

    private sealed class ListingsLatestAggregatedResponse
    {
        [JsonPropertyName("market_hash_name")]
        public string MarketHashName { get; set; } = string.Empty;

        [JsonPropertyName("listings")]
        public List<ListingItem> Listings { get; set; } = new();
    }

    private sealed class ListingItem
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("market")]
        public string Market { get; set; } = string.Empty;

        [JsonPropertyName("market_link")]
        public string MarketLink { get; set; } = string.Empty;

        [JsonPropertyName("mean_price")]
        public decimal? MeanPrice { get; set; }

        [JsonPropertyName("min_price")]
        public decimal? MinPrice { get; set; }

        [JsonPropertyName("max_price")]
        public decimal? MaxPrice { get; set; }

        [JsonPropertyName("median_price")]
        public decimal? MedianPrice { get; set; }

        [JsonPropertyName("listings")]
        public int Listings { get; set; }

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; }
    }

    private sealed class SalesLatestAggregatedResponse
    {
        [JsonPropertyName("market_hash_name")]
        public string MarketHashName { get; set; } = string.Empty;

        [JsonPropertyName("sales")]
        public List<SaleItem> Sales { get; set; } = new();
    }

    private sealed class SaleItem
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("market")]
        public string Market { get; set; } = string.Empty;

        [JsonPropertyName("mean_price")]
        public decimal? MeanPrice { get; set; }

        [JsonPropertyName("min_price")]
        public decimal? MinPrice { get; set; }

        [JsonPropertyName("max_price")]
        public decimal? MaxPrice { get; set; }

        [JsonPropertyName("median_price")]
        public decimal? MedianPrice { get; set; }

        [JsonPropertyName("volume")]
        public int? Volume { get; set; }

        [JsonPropertyName("day")]
        public DateTime Day { get; set; }
    }

    private sealed class CachedPriceEntry
    {
        public decimal? Price { get; init; }
    }
}

