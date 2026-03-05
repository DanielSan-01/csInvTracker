using AngleSharp;
using AngleSharp.Html.Dom;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace backend.Services;

/// <summary>
/// Service to scrape price data from csgoskins.gg using HTML parsing.
/// Uses AngleSharp (C# HTML5 parser) similar to justhtml in Python.
/// </summary>
public class CsgoskinsScraperService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CsgoskinsScraperService> _logger;
    private readonly TimeSpan _cacheDuration;
    private readonly TimeSpan _requestTimeout;

    public CsgoskinsScraperService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<CsgoskinsScraperService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _logger = logger;

        var cacheSeconds = configuration.GetValue<int?>("Csgoskins:CacheSeconds") ?? 300; // Default 5 minutes
        _cacheDuration = TimeSpan.FromSeconds(cacheSeconds);
        _requestTimeout = TimeSpan.FromSeconds(15);
    }

    /// <summary>
    /// Scrapes price data from csgoskins.gg for a given skin slug and optional exterior.
    /// </summary>
    /// <param name="skinSlug">URL-friendly skin name (e.g., "m9-bayonet-ultraviolet")</param>
    /// <param name="exteriorSlug">Optional exterior condition (e.g., "field-tested")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Price data if found, null otherwise</returns>
    public async Task<CsgoskinsPriceData?> GetPriceAsync(
        string skinSlug,
        string? exteriorSlug = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(skinSlug))
        {
            return null;
        }

        var normalizedSlug = skinSlug.Trim().ToLowerInvariant();
        var normalizedExterior = exteriorSlug?.Trim().ToLowerInvariant();
        var cacheKey = $"csgoskins:{normalizedSlug}:{normalizedExterior ?? "none"}";

        // Check cache
        if (_cache.TryGetValue<CsgoskinsPriceData>(cacheKey, out var cached) && cached is not null)
        {
            _logger.LogDebug("Csgoskins cache hit for {SkinSlug}", normalizedSlug);
            return cached;
        }

        try
        {
            // Build URL
            var url = string.IsNullOrWhiteSpace(normalizedExterior)
                ? $"https://www.csgoskins.gg/items/{normalizedSlug}"
                : $"https://www.csgoskins.gg/items/{normalizedSlug}/{normalizedExterior}";

            _logger.LogDebug("Scraping csgoskins.gg for {Url}", url);

            // Fetch HTML
            var html = await FetchHtmlAsync(url, cancellationToken);
            if (string.IsNullOrWhiteSpace(html))
            {
                _logger.LogWarning("Failed to fetch HTML from {Url}", url);
                return null;
            }

            // Parse HTML and extract price data
            var priceData = await ParsePriceDataAsync(html, cancellationToken);
            if (priceData is not null)
            {
                // Cache successful result
                _cache.Set(cacheKey, priceData, _cacheDuration);
                _logger.LogDebug("Successfully scraped price data for {SkinSlug}: {Price}", normalizedSlug, priceData.Price);
            }

            return priceData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scraping csgoskins.gg for {SkinSlug}", normalizedSlug);
            return null;
        }
    }

    private async Task<string?> FetchHtmlAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = _requestTimeout;

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            request.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            request.Headers.Add("Accept-Language", "en-US,en;q=0.9");

            using var response = await client.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("csgoskins.gg returned {StatusCode} for {Url}", response.StatusCode, url);
                return null;
            }

            return await response.Content.ReadAsStringAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching HTML from {Url}", url);
            return null;
        }
    }

    private async Task<CsgoskinsPriceData?> ParsePriceDataAsync(string html, CancellationToken cancellationToken)
    {
        try
        {
            // Create AngleSharp context
            var context = BrowsingContext.New(Configuration.Default);
            var document = await context.OpenAsync(req => req.Content(html), cancellationToken);

            // Selectors based on csgoskins.gg structure
            // First find div.order-1 container (item details panel on the left)
            var order1Div = document.QuerySelector("div.order-1");
            
            IHtmlElement? priceElement = null;
            string? priceText = null;

            if (order1Div != null)
            {
                // Within div.order-1, find span.font-bold that contains a price
                var boldSpans = order1Div.QuerySelectorAll("span.font-bold");
                foreach (var span in boldSpans)
                {
                    var text = span.TextContent?.Trim() ?? "";
                    // Check if it looks like a price (starts with $ and contains numbers)
                    if (text.StartsWith("$") && text.Length > 1)
                    {
                        priceText = text;
                        priceElement = span;
                        break;
                    }
                }
            }

            // Fallback: if div.order-1 not found or no price in it, try searching entire document
            if (string.IsNullOrWhiteSpace(priceText))
            {
                var allBoldSpans = document.QuerySelectorAll("span.font-bold");
                foreach (var span in allBoldSpans)
                {
                    var text = span.TextContent?.Trim() ?? "";
                    if (text.StartsWith("$") && text.Length > 1)
                    {
                        priceText = text;
                        priceElement = span;
                        break;
                    }
                }
            }

            if (string.IsNullOrWhiteSpace(priceText))
            {
                _logger.LogWarning("Could not find price element in HTML");
                return null;
            }

            // Extract numeric price (remove currency symbols, commas, etc.)
            var price = ExtractPrice(priceText);
            if (!price.HasValue)
            {
                _logger.LogWarning("Could not parse price from text: {PriceText}", priceText);
                return null;
            }

            // Try to find additional data (volume, listings, etc.)
            var volumeElement = document.QuerySelector(".volume, [data-volume], .sales-count");
            var volumeText = volumeElement?.TextContent?.Trim();

            var listingsElement = document.QuerySelector(".listings, [data-listings], .active-listings");
            var listingsText = listingsElement?.TextContent?.Trim();

            return new CsgoskinsPriceData
            {
                Price = price.Value,
                PriceText = priceText,
                Volume = ParseInt(volumeText),
                Listings = ParseInt(listingsText),
                ScrapedAt = DateTimeOffset.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing HTML");
            return null;
        }
    }

    private static decimal? ExtractPrice(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        // Remove currency symbols, commas, and extract number
        var cleaned = text
            .Replace("$", "")
            .Replace("€", "")
            .Replace("£", "")
            .Replace(",", "")
            .Replace("USD", "")
            .Trim();

        // Try to parse as decimal
        if (decimal.TryParse(cleaned, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var price))
        {
            return price;
        }

        return null;
    }

    private static int? ParseInt(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        // Remove common formatting (commas, spaces, etc.)
        var cleaned = text.Replace(",", "").Replace(" ", "").Trim();

        if (int.TryParse(cleaned, out var value))
        {
            return value;
        }

        return null;
    }
}

/// <summary>
/// Price data scraped from csgoskins.gg
/// </summary>
public class CsgoskinsPriceData
{
    public decimal Price { get; set; }
    public string? PriceText { get; set; }
    public int? Volume { get; set; }
    public int? Listings { get; set; }
    public DateTimeOffset ScrapedAt { get; set; }
}

