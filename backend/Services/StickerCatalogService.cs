using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Service to fetch sticker catalog data from database (populated from Steam inventory imports)
/// Matches sticker names to get images and prices
/// </summary>
public class StickerCatalogService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<StickerCatalogService> _logger;

    public StickerCatalogService(
        ApplicationDbContext context,
        ILogger<StickerCatalogService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Gets sticker information (image URL and price) for a sticker name from database
    /// Database is populated from Steam inventory imports
    /// </summary>
    public async Task<StickerInfo?> GetStickerInfoAsync(string stickerName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(stickerName))
            return null;

        // Find in database (populated from Steam inventory imports)
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


    public class StickerInfo
    {
        public string Name { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public decimal? Price { get; set; }
    }
}

