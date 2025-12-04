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
        public List<string> SkippedItems { get; set; } = new(); // Track which items were skipped and why
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

                // Skip items that are both non-marketable AND non-tradable
                // (Allow items that are marketable OR tradable, as some items might be one but not the other)
                if (!steamItem.Marketable && !steamItem.Tradable)
                {
                    _logger.LogDebug("Skipping non-marketable and non-tradable item: {MarketHashName}", steamItem.MarketHashName);
                    result.Skipped++;
                    result.SkippedItems.Add($"{steamItem.MarketHashName} (not marketable/tradable)");
                    continue;
                }

                // Find matching skin in catalog
                var matchingSkin = FindMatchingSkin(allSkins, steamItem.MarketHashName);
                if (matchingSkin == null)
                {
                    _logger.LogWarning("No matching skin found in catalog for: {MarketHashName} (AssetId: {AssetId})", 
                        steamItem.MarketHashName, steamItem.AssetId);
                    result.Skipped++;
                    result.SkippedItems.Add($"{steamItem.MarketHashName} (no catalog match)");
                    result.ErrorMessages.Add($"No catalog match: {steamItem.MarketHashName}");
                    continue;
                }
                
                _logger.LogDebug("Found matching skin: {MarketHashName} -> {SkinName} (SkinId: {SkinId})", 
                    steamItem.MarketHashName, matchingSkin.Name, matchingSkin.Id);

                // Check if item already exists by AssetId (unique Steam identifier)
                // If it exists, update it with latest Steam data (especially image URL)
                InventoryItem? existingItem = null;
                if (!string.IsNullOrEmpty(steamItem.AssetId))
                {
                    existingItem = await _context.InventoryItems
                        .FirstOrDefaultAsync(i => i.AssetId == steamItem.AssetId, cancellationToken);
                }

                if (existingItem != null)
                {
                    // Update existing item with latest Steam data (especially image URL)
                    _logger.LogDebug("Updating existing item with latest Steam data: AssetId {AssetId}, {MarketHashName}", 
                        steamItem.AssetId, steamItem.MarketHashName);
                    
                    // Extract item properties from Steam descriptions
                    var (updatedFloatValue, updatedExterior, updatedPaintSeed, updatedPaintIndex, updatedStickers) = ExtractItemProperties(steamItem);
                    
                    // Always update with Steam's image URL if available (Steam has the latest images)
                    if (!string.IsNullOrEmpty(steamItem.ImageUrl))
                    {
                        existingItem.ImageUrl = steamItem.ImageUrl;
                    }
                    
                    // Update other properties that might have changed
                    existingItem.Float = updatedFloatValue;
                    existingItem.Exterior = updatedExterior;
                    existingItem.PaintSeed = updatedPaintSeed;
                    existingItem.TradeProtected = !steamItem.Tradable;
                    
                    // Update stickers if any
                    if (updatedStickers != null && updatedStickers.Count > 0)
                    {
                        // Remove old stickers
                        var oldStickers = _context.Stickers.Where(s => s.InventoryItemId == existingItem.Id).ToList();
                        _context.Stickers.RemoveRange(oldStickers);
                        
                        // Add new stickers
                        foreach (var sticker in updatedStickers)
                        {
                            var stickerEntity = new Sticker
                            {
                                InventoryItemId = existingItem.Id,
                                Name = sticker.Name,
                                Price = sticker.Price,
                                Slot = sticker.Slot,
                                ImageUrl = sticker.ImageUrl
                            };
                            _context.Stickers.Add(stickerEntity);
                        }
                    }
                    
                    await _context.SaveChangesAsync(cancellationToken);
                    result.Imported++; // Count as imported (updated)
                    continue;
                }

                // Extract item properties from Steam descriptions
                var (floatValue, exterior, paintSeed, paintIndex, stickers) = ExtractItemProperties(steamItem);

                // Create inventory item
                // Always prefer Steam's image URL (it's always up-to-date from Steam's CDN)
                // Only fall back to catalog image if Steam doesn't provide one (shouldn't happen)
                var imageUrl = !string.IsNullOrEmpty(steamItem.ImageUrl) 
                    ? steamItem.ImageUrl 
                    : matchingSkin.ImageUrl;
                
                var inventoryItem = new InventoryItem
                {
                    UserId = userId,
                    SkinId = matchingSkin.Id,
                    AssetId = steamItem.AssetId, // Store Steam asset ID for duplicate detection
                    Float = floatValue,
                    Exterior = exterior,
                    PaintSeed = paintSeed,
                    ImageUrl = imageUrl,
                    Price = 0, // Would need to fetch from market API
                    TradeProtected = !steamItem.Tradable,
                    AcquiredAt = DateTime.UtcNow
                };

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
    /// Uses multiple matching strategies to find the best match
    /// </summary>
    private Skin? FindMatchingSkin(List<Skin> skins, string marketHashName)
    {
        if (string.IsNullOrWhiteSpace(marketHashName))
            return null;

        var normalizedSearch = NormalizeSkinName(marketHashName);
        if (string.IsNullOrWhiteSpace(normalizedSearch))
            return null;

        // Strategy 1: Exact match (case-insensitive)
        var exactMatch = skins.FirstOrDefault(s =>
            NormalizeSkinName(s.Name).Equals(normalizedSearch, StringComparison.OrdinalIgnoreCase));
        if (exactMatch != null)
        {
            _logger.LogDebug("Exact match found: {MarketHashName} -> {SkinName}", marketHashName, exactMatch.Name);
            return exactMatch;
        }

        // Strategy 2: Exact match on original name (before normalization)
        var exactOriginalMatch = skins.FirstOrDefault(s =>
            s.Name.Equals(marketHashName, StringComparison.OrdinalIgnoreCase));
        if (exactOriginalMatch != null)
        {
            _logger.LogDebug("Exact original match found: {MarketHashName} -> {SkinName}", marketHashName, exactOriginalMatch.Name);
            return exactOriginalMatch;
        }

        // Strategy 3: Contains match (either direction)
        var containsMatch = skins.FirstOrDefault(s =>
        {
            var normalizedSkin = NormalizeSkinName(s.Name);
            return normalizedSkin.Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase) ||
                   normalizedSearch.Contains(normalizedSkin, StringComparison.OrdinalIgnoreCase);
        });
        if (containsMatch != null)
        {
            _logger.LogDebug("Contains match found: {MarketHashName} -> {SkinName}", marketHashName, containsMatch.Name);
            return containsMatch;
        }

        // Strategy 4: Word-based fuzzy matching
        var searchWords = normalizedSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 2) // Ignore very short words
            .ToArray();
            
        if (searchWords.Length > 0)
        {
            var bestMatch = skins
                .Select(s => new { 
                    Skin = s, 
                    Score = CalculateMatchScore(NormalizeSkinName(s.Name), normalizedSearch, searchWords) 
                })
                .Where(x => x.Score > 20) // Require at least 2 words to match
                .OrderByDescending(x => x.Score)
                .FirstOrDefault();

            if (bestMatch != null)
            {
                _logger.LogDebug("Fuzzy match found (score: {Score}): {MarketHashName} -> {SkinName}", 
                    bestMatch.Score, marketHashName, bestMatch.Skin.Name);
                return bestMatch.Skin;
            }
        }

        return null;
    }

    private static string NormalizeSkinName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return string.Empty;
            
        return name
            .Replace("★", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("|", " ", StringComparison.OrdinalIgnoreCase) // Replace | with space to preserve word separation
            .Replace("StatTrak™", "StatTrak", StringComparison.OrdinalIgnoreCase)
            .Replace("StatTrak", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("Souvenir", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("™", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("(", " ", StringComparison.OrdinalIgnoreCase)
            .Replace(")", " ", StringComparison.OrdinalIgnoreCase)
            .Trim()
            .Replace("  ", " ", StringComparison.OrdinalIgnoreCase)
            .Replace("  ", " ", StringComparison.OrdinalIgnoreCase); // Do it twice to catch triple spaces
    }

    private static int CalculateMatchScore(string skinName, string searchName, string[] searchWords)
    {
        var score = 0;
        var normalizedSkin = NormalizeSkinName(skinName).ToLowerInvariant();
        var normalizedSearch = searchName.ToLowerInvariant();

        // Score based on word matches
        foreach (var word in searchWords)
        {
            var wordLower = word.ToLowerInvariant();
            if (normalizedSkin.Contains(wordLower))
            {
                // Longer words are more significant
                score += Math.Min(word.Length * 2, 20);
            }
        }

        // Bonus for containing the full search string
        if (normalizedSkin.Contains(normalizedSearch))
        {
            score += 50;
        }

        // Bonus for starting with the same words
        var skinWords = normalizedSkin.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var searchWordsLower = searchWords.Select(w => w.ToLowerInvariant()).ToArray();
        var matchingStartWords = 0;
        for (int i = 0; i < Math.Min(skinWords.Length, searchWordsLower.Length); i++)
        {
            if (skinWords[i] == searchWordsLower[i])
            {
                matchingStartWords++;
            }
            else
            {
                break;
            }
        }
        score += matchingStartWords * 15;

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

