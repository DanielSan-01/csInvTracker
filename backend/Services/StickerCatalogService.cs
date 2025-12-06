using System.Text.Json;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Service to fetch and cache sticker catalog data from ByMykel API
/// Matches sticker names to get images and prices
/// </summary>
public class StickerCatalogService
{
    private const string ByMykelStickersUrl = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<StickerCatalogService> _logger;
    private static Dictionary<string, StickerCatalogEntry>? _cachedCatalog;
    private static DateTime? _cacheExpiry;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24); // Cache for 24 hours

    public StickerCatalogService(
        IHttpClientFactory httpClientFactory,
        ApplicationDbContext context,
        ILogger<StickerCatalogService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Gets sticker information (image URL and price) for a sticker name
    /// First tries to match from ByMykel catalog, then falls back to database lookup
    /// </summary>
    public async Task<StickerInfo?> GetStickerInfoAsync(string stickerName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(stickerName))
            return null;

        // Try to get from ByMykel catalog first
        var catalog = await GetCatalogAsync(cancellationToken);
        if (catalog != null)
        {
            // Try exact match first
            if (catalog.TryGetValue(stickerName, out var exactMatch))
            {
                return new StickerInfo
                {
                    Name = stickerName,
                    ImageUrl = exactMatch.ImageUrl,
                    Price = exactMatch.Price
                };
            }

            // Try fuzzy matching (case-insensitive, partial match)
            var normalizedSearch = NormalizeStickerName(stickerName);
            var match = catalog.FirstOrDefault(kvp => 
                NormalizeStickerName(kvp.Key).Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase) ||
                normalizedSearch.Contains(NormalizeStickerName(kvp.Key), StringComparison.OrdinalIgnoreCase));

            if (match.Key != null)
            {
                _logger.LogDebug("Fuzzy matched sticker '{StickerName}' to catalog entry '{CatalogName}'", 
                    stickerName, match.Key);
                return new StickerInfo
                {
                    Name = stickerName,
                    ImageUrl = match.Value.ImageUrl,
                    Price = match.Value.Price
                };
            }
        }

        // Fallback: Try to find in database (from previously imported stickers)
        var dbSticker = await _context.Stickers
            .Where(s => s.Name == stickerName || s.Name.Contains(stickerName))
            .OrderByDescending(s => s.ImageUrl != null && s.ImageUrl != string.Empty)
            .FirstOrDefaultAsync(cancellationToken);

        if (dbSticker != null && (!string.IsNullOrEmpty(dbSticker.ImageUrl) || dbSticker.Price.HasValue))
        {
            _logger.LogDebug("Found sticker '{StickerName}' in database", stickerName);
            return new StickerInfo
            {
                Name = stickerName,
                ImageUrl = dbSticker.ImageUrl,
                Price = dbSticker.Price
            };
        }

        _logger.LogDebug("No sticker info found for '{StickerName}'", stickerName);
        return null;
    }

    /// <summary>
    /// Gets sticker information for multiple stickers (batch lookup)
    /// </summary>
    public async Task<Dictionary<string, StickerInfo>> GetStickerInfoBatchAsync(
        IEnumerable<string> stickerNames, 
        CancellationToken cancellationToken = default)
    {
        var results = new Dictionary<string, StickerInfo>();
        
        foreach (var name in stickerNames)
        {
            if (string.IsNullOrWhiteSpace(name))
                continue;

            var info = await GetStickerInfoAsync(name, cancellationToken);
            if (info != null)
            {
                results[name] = info;
            }
        }

        return results;
    }

    /// <summary>
    /// Gets the sticker catalog from ByMykel API (with caching)
    /// </summary>
    private async Task<Dictionary<string, StickerCatalogEntry>?> GetCatalogAsync(CancellationToken cancellationToken)
    {
        // Check cache
        if (_cachedCatalog != null && _cacheExpiry.HasValue && DateTime.UtcNow < _cacheExpiry.Value)
        {
            return _cachedCatalog;
        }

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            _logger.LogInformation("Fetching sticker catalog from ByMykel API...");
            var response = await httpClient.GetAsync(ByMykelStickersUrl, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("ByMykel API returned {StatusCode} for stickers", response.StatusCode);
                return _cachedCatalog; // Return stale cache if available
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var stickers = JsonSerializer.Deserialize<List<JsonElement>>(json);

            if (stickers == null || stickers.Count == 0)
            {
                _logger.LogWarning("No stickers returned from ByMykel API");
                return _cachedCatalog; // Return stale cache if available
            }

            var catalog = new Dictionary<string, StickerCatalogEntry>(StringComparer.OrdinalIgnoreCase);

            foreach (var sticker in stickers)
            {
                try
                {
                    var name = sticker.GetProperty("name").GetString();
                    if (string.IsNullOrWhiteSpace(name))
                        continue;

                    // Extract image URL
                    string? imageUrl = null;
                    if (sticker.TryGetProperty("image", out var imageProp))
                    {
                        imageUrl = imageProp.GetString();
                    }

                    // Extract price (if available)
                    decimal? price = null;
                    if (sticker.TryGetProperty("price", out var priceProp))
                    {
                        if (priceProp.ValueKind == JsonValueKind.Number)
                        {
                            price = priceProp.GetDecimal();
                        }
                        else if (priceProp.ValueKind == JsonValueKind.String)
                        {
                            if (decimal.TryParse(priceProp.GetString(), out var parsedPrice))
                            {
                                price = parsedPrice;
                            }
                        }
                    }

                    // Store with normalized name for better matching
                    var normalizedName = NormalizeStickerName(name);
                    catalog[normalizedName] = new StickerCatalogEntry
                    {
                        Name = name,
                        ImageUrl = imageUrl,
                        Price = price
                    };

                    // Also store with original name for exact matching
                    if (!catalog.ContainsKey(name))
                    {
                        catalog[name] = catalog[normalizedName];
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error parsing sticker entry from ByMykel API");
                }
            }

            _cachedCatalog = catalog;
            _cacheExpiry = DateTime.UtcNow.Add(CacheDuration);
            _logger.LogInformation("Loaded {Count} stickers from ByMykel catalog (cached for 24h)", catalog.Count);

            return catalog;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching sticker catalog from ByMykel API");
            return _cachedCatalog; // Return stale cache if available
        }
    }

    /// <summary>
    /// Normalizes sticker name for better matching
    /// Removes common prefixes and normalizes formatting
    /// </summary>
    private static string NormalizeStickerName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return string.Empty;

        return name
            .Replace("Sticker | ", "", StringComparison.OrdinalIgnoreCase)
            .Replace("Sticker|", "", StringComparison.OrdinalIgnoreCase)
            .Trim();
    }

    private class StickerCatalogEntry
    {
        public string Name { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public decimal? Price { get; set; }
    }

    public class StickerInfo
    {
        public string Name { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public decimal? Price { get; set; }
    }
}

