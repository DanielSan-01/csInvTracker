using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.Services;

/// <summary>
/// Lightweight HTTP client for CSMarketAPI used to fetch market prices.
/// </summary>
public class CsMarketApiService
{
    private static readonly Uri BaseUri = new("https://api.csmarketapi.com");
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CsMarketApiService> _logger;
    private readonly string _apiKey;
    private readonly string _currency;
    private readonly string[] _defaultMarkets;
    private readonly int? _maxAgeSeconds;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    public CsMarketApiService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<CsMarketApiService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        var configuredKey = configuration["CsMarket:ApiKey"];
        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            configuredKey = Environment.GetEnvironmentVariable("CSMARKET_API_KEY");
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
    }

    /// <summary>
    /// Gets a best-effort market price for the given market hash name using CSMarketAPI data.
    /// </summary>
    public async Task<decimal?> GetBestListingPriceAsync(
        string marketHashName,
        IEnumerable<string>? markets = null,
        CancellationToken cancellationToken = default)
    {
        var data = await GetListingsLatestAggregatedAsync(marketHashName, markets, cancellationToken);
        return ExtractBestPrice(data);
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
            var price = await GetBestListingPriceAsync(trimmed, markets, cancellationToken);
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

            using var response = await httpClient.GetAsync(requestUri, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "CSMarket API returned {StatusCode} for {MarketHashName}. Response: {Body}",
                    response.StatusCode,
                    marketHashName,
                    body.Length > 300 ? body[..300] : body);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var result = await JsonSerializer.DeserializeAsync<ListingsLatestAggregatedResponse>(
                stream,
                JsonOptions,
                cancellationToken);

            return result;
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

        var providedMarkets = markets?.Where(m => !string.IsNullOrWhiteSpace(m))
            .Select(m => m.Trim().ToUpperInvariant())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var targetMarkets = providedMarkets is { Length: > 0 }
            ? providedMarkets
            : _defaultMarkets;

        foreach (var market in targetMarkets)
        {
            if (!string.IsNullOrWhiteSpace(market))
            {
                query.Add(BuildQueryParameter("markets", market));
            }
        }

        if (_maxAgeSeconds.HasValue)
        {
            query.Add(BuildQueryParameter("max_age", _maxAgeSeconds.Value.ToString()));
        }

        builder.Query = string.Join("&", query);
        return builder.Uri;
    }

    private static string BuildQueryParameter(string name, string value)
    {
        var encoded = Uri.EscapeDataString(value);
        return $"{Uri.EscapeDataString(name)}={encoded}";
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
        public int Id { get; set; }

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
}

