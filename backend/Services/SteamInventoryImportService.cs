using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace backend.Services;

public class SteamInventoryImportService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SteamInventoryImportService> _logger;
    private readonly DopplerPhaseService _dopplerPhaseService;

    public SteamInventoryImportService(
        ApplicationDbContext context,
        ILogger<SteamInventoryImportService> logger,
        DopplerPhaseService dopplerPhaseService)
    {
        _context = context;
        _logger = logger;
        _dopplerPhaseService = dopplerPhaseService;
    }

    public class ImportResult
    {
        public int TotalItems { get; set; }
        public int Imported { get; set; }
        public int Skipped { get; set; }
        public int Errors { get; set; }
        public List<string> ErrorMessages { get; set; } = new();
    }

    /// <summary>
    /// Imports Steam inventory items for a user
    /// </summary>
    public async Task<ImportResult> ImportSteamInventoryAsync(
        int userId,
        List<SteamInventoryItemDto> steamItems,
        CancellationToken cancellationToken = default)
    {
        var result = new ImportResult
        {
            TotalItems = steamItems.Count
        };

        // Get all skins from catalog for matching
        var allSkins = await _context.Skins.ToListAsync(cancellationToken);
        _logger.LogInformation("Loaded {Count} skins from catalog for matching", allSkins.Count);

        foreach (var steamItem in steamItems)
        {
            try
            {
                cancellationToken.ThrowIfCancellationRequested();

                // Skip non-marketable or non-tradable items (like cases, stickers, etc.)
                if (!steamItem.Marketable || !steamItem.Tradable)
                {
                    result.Skipped++;
                    continue;
                }

                // Find matching skin in catalog
                var matchingSkin = FindMatchingSkin(allSkins, steamItem.MarketHashName);
                if (matchingSkin == null)
                {
                    _logger.LogDebug("No matching skin found for: {MarketHashName}", steamItem.MarketHashName);
                    result.Skipped++;
                    continue;
                }

                // Check if item already exists (by Steam asset ID if we store it, or by skin + user)
                // For now, we'll check by skin ID and user ID to avoid duplicates
                var existingItem = await _context.InventoryItems
                    .FirstOrDefaultAsync(i => i.UserId == userId && i.SkinId == matchingSkin.Id, cancellationToken);

                if (existingItem != null)
                {
                    // Update existing item with Steam data if needed
                    result.Skipped++;
                    continue;
                }

                // Extract item properties from Steam descriptions
                var (floatValue, exterior, paintSeed, paintIndex, stickers) = ExtractItemProperties(steamItem);

                // Create inventory item
                var inventoryItem = new InventoryItem
                {
                    UserId = userId,
                    SkinId = matchingSkin.Id,
                    Float = floatValue,
                    Exterior = exterior,
                    PaintSeed = paintSeed,
                    PaintIndex = paintIndex ?? matchingSkin.PaintIndex,
                    ImageUrl = steamItem.ImageUrl ?? matchingSkin.ImageUrl,
                    Price = 0, // Would need to fetch from market API
                    TradeProtected = !steamItem.Tradable,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Handle Doppler phase
                if (paintIndex.HasValue)
                {
                    var dopplerInfo = _dopplerPhaseService.GetPhaseInfo(paintIndex.Value);
                    if (dopplerInfo != null)
                    {
                        inventoryItem.DopplerPhase = dopplerInfo.Phase;
                        inventoryItem.DopplerPhaseImageUrl = dopplerInfo.ImageUrl;
                    }
                }

                _context.InventoryItems.Add(inventoryItem);
                await _context.SaveChangesAsync(cancellationToken);

                // Add stickers if any
                if (stickers != null && stickers.Count > 0)
                {
                    foreach (var sticker in stickers)
                    {
                        var stickerEntity = new Sticker
                        {
                            InventoryItemId = inventoryItem.Id,
                            Name = sticker.Name,
                            Price = sticker.Price,
                            Slot = sticker.Slot,
                            ImageUrl = sticker.ImageUrl
                        };
                        _context.Stickers.Add(stickerEntity);
                    }
                    await _context.SaveChangesAsync(cancellationToken);
                }

                result.Imported++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing Steam item: {MarketHashName}", steamItem.MarketHashName);
                result.Errors++;
                result.ErrorMessages.Add($"Error importing {steamItem.MarketHashName}: {ex.Message}");
            }
        }

        return result;
    }

    /// <summary>
    /// Finds a matching skin in the catalog by market hash name
    /// </summary>
    private Skin? FindMatchingSkin(List<Skin> skins, string marketHashName)
    {
        if (string.IsNullOrWhiteSpace(marketHashName))
            return null;

        var normalizedSearch = NormalizeSkinName(marketHashName);

        // Try exact match first
        var exactMatch = skins.FirstOrDefault(s =>
            NormalizeSkinName(s.Name).Equals(normalizedSearch, StringComparison.OrdinalIgnoreCase));
        if (exactMatch != null) return exactMatch;

        // Try contains match
        var containsMatch = skins.FirstOrDefault(s =>
            NormalizeSkinName(s.Name).Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase) ||
            normalizedSearch.Contains(NormalizeSkinName(s.Name), StringComparison.OrdinalIgnoreCase));
        if (containsMatch != null) return containsMatch;

        // Try word-based matching
        var searchWords = normalizedSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var bestMatch = skins
            .Select(s => new { Skin = s, Score = CalculateMatchScore(NormalizeSkinName(s.Name), normalizedSearch, searchWords) })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .FirstOrDefault();

        return bestMatch?.Skin;
    }

    private static string NormalizeSkinName(string name)
    {
        return name
            .Replace("★", string.Empty)
            .Replace("|", string.Empty)
            .Replace("StatTrak™", "StatTrak")
            .Replace("StatTrak", string.Empty)
            .Replace("Souvenir", string.Empty)
            .Trim()
            .Replace("  ", " ");
    }

    private static int CalculateMatchScore(string skinName, string searchName, string[] searchWords)
    {
        var score = 0;
        var normalizedSkin = NormalizeSkinName(skinName).ToLowerInvariant();

        foreach (var word in searchWords)
        {
            if (normalizedSkin.Contains(word.ToLowerInvariant()))
            {
                score += 10;
            }
        }

        if (normalizedSkin.Contains(searchName.ToLowerInvariant()))
        {
            score += 50;
        }

        return score;
    }

    /// <summary>
    /// Extracts item properties from Steam item descriptions
    /// </summary>
    private (double floatValue, string exterior, int? paintSeed, int? paintIndex, List<StickerInfo>? stickers) ExtractItemProperties(SteamInventoryItemDto steamItem)
    {
        double floatValue = 0.5;
        string exterior = "Field-Tested";
        int? paintSeed = null;
        int? paintIndex = null;
        List<StickerInfo>? stickers = null;

        if (steamItem.Descriptions != null)
        {
            foreach (var desc in steamItem.Descriptions)
            {
                var value = desc.Value ?? "";
                
                // Extract float value
                if (desc.Type == "float" || value.Contains("Float:", StringComparison.OrdinalIgnoreCase))
                {
                    var floatMatch = Regex.Match(value, @"[\d.]+");
                    if (floatMatch.Success && double.TryParse(floatMatch.Value, out var parsedFloat))
                    {
                        floatValue = parsedFloat;
                        exterior = GetExteriorFromFloat(floatValue);
                    }
                }

                // Extract paint seed
                if (value.Contains("Paint Seed:", StringComparison.OrdinalIgnoreCase) || value.Contains("Seed:", StringComparison.OrdinalIgnoreCase))
                {
                    var seedMatch = Regex.Match(value, @"\d+");
                    if (seedMatch.Success && int.TryParse(seedMatch.Value, out var seed))
                    {
                        paintSeed = seed;
                    }
                }

                // Extract paint index (for Doppler phases)
                if (value.Contains("Paint Index:", StringComparison.OrdinalIgnoreCase))
                {
                    var indexMatch = Regex.Match(value, @"\d+");
                    if (indexMatch.Success && int.TryParse(indexMatch.Value, out var index))
                    {
                        paintIndex = index;
                    }
                }
            }
        }

        // Extract stickers from tags or descriptions
        if (steamItem.Tags != null)
        {
            var stickerTags = steamItem.Tags.Where(t => t.Category == "Sticker").ToList();
            if (stickerTags.Count > 0)
            {
                stickers = new List<StickerInfo>();
                for (int i = 0; i < stickerTags.Count && i < 5; i++) // Max 5 stickers
                {
                    var tag = stickerTags[i];
                    stickers.Add(new StickerInfo
                    {
                        Name = tag.LocalizedTagName,
                        Slot = i,
                        Price = null, // Would need to fetch from sticker catalog
                        ImageUrl = null // Would need to fetch from sticker catalog
                    });
                }
            }
        }

        return (floatValue, exterior, paintSeed, paintIndex, stickers);
    }

    private static string GetExteriorFromFloat(double floatValue)
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
}

public class SteamInventoryItemDto
{
    public string AssetId { get; set; } = string.Empty;
    public string MarketHashName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool Marketable { get; set; }
    public bool Tradable { get; set; }
    public List<SteamDescriptionDto>? Descriptions { get; set; }
    public List<SteamTagDto>? Tags { get; set; }
}

public class SteamDescriptionDto
{
    public string Type { get; set; } = string.Empty;
    public string? Value { get; set; }
    public string? Color { get; set; }
}

public class SteamTagDto
{
    public string Category { get; set; } = string.Empty;
    public string LocalizedTagName { get; set; } = string.Empty;
}

public class StickerInfo
{
    public string Name { get; set; } = string.Empty;
    public int Slot { get; set; }
    public decimal? Price { get; set; }
    public string? ImageUrl { get; set; }
}

