using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using System;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Globalization;
using System.IO;

namespace backend.Services;

public class SteamInventoryImportService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SteamInventoryImportService> _logger;
    private readonly DopplerPhaseService _dopplerPhaseService;
    private readonly CsMarketApiService _csMarketApiService;
    private readonly StickerCatalogService? _stickerCatalogService;
    private readonly InspectFloatQueue _inspectQueue;
    private const decimal SteamWalletLimit = 2000m;
    private const string DebugLogPath = "/Users/danielostensen/commonplace/csInvTracker/.cursor/debug.log";
    private static readonly object DebugLogLock = new();

    public SteamInventoryImportService(
        ApplicationDbContext context,
        ILogger<SteamInventoryImportService> logger,
        DopplerPhaseService dopplerPhaseService,
        CsMarketApiService csMarketApiService,
        StickerCatalogService? stickerCatalogService,
        InspectFloatQueue inspectQueue)
    {
        _context = context;
        _logger = logger;
        _dopplerPhaseService = dopplerPhaseService;
        _csMarketApiService = csMarketApiService;
        _stickerCatalogService = stickerCatalogService;
        _inspectQueue = inspectQueue;
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
                global::System.IO.File.AppendAllText(DebugLogPath, json + Environment.NewLine);
            }
        }
        catch
        {
            // Swallow instrumentation errors
        }
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
        bool fetchMarketPrices = true,
        CancellationToken cancellationToken = default)
    {
        var result = new ImportResult { TotalItems = steamItems.Count };
        var allSkins = await _context.Skins.ToListAsync(cancellationToken);
        _logger.LogInformation("Loaded {Count} skins from catalog for matching", allSkins.Count);

        static bool HasMeaningfulFloat(double value) => value > 0 && Math.Abs(value - 0.5) > 0.000001;
        static double NormalizeFloat(double value) => HasMeaningfulFloat(value) ? value : 0.5;

        Dictionary<string, decimal?> marketPrices = new(StringComparer.OrdinalIgnoreCase);
        if (fetchMarketPrices)
        {
            var marketHashNames = steamItems
                .Where(item => !string.IsNullOrWhiteSpace(item.MarketHashName))
                .Select(item => item.MarketHashName)
                .Distinct()
                .ToList();

            _logger.LogInformation("Fetching CSMarket prices for {Count} items...", marketHashNames.Count);
            marketPrices = await _csMarketApiService.GetBestListingPricesAsync(
                marketHashNames,
                delayMs: 200,
                cancellationToken: cancellationToken);

            var pricesFound = marketPrices.Values.Count(p => p.HasValue);
            _logger.LogInformation("Fetched market prices for {Found}/{Total} items", pricesFound, marketHashNames.Count);

            if (_csMarketApiService.EncounteredRateLimit)
            {
                _logger.LogWarning("CSMarket rate limit encountered while importing Steam inventory for user {UserId}", userId);
                foreach (var detail in _csMarketApiService.RateLimitMessages)
                {
                    _logger.LogDebug("CSMarket rate limit detail: {Detail}", detail);
                }
            }
        }
        else
        {
            _logger.LogInformation("Skipping CSMarket price fetch; updating floats only for {Count} items", steamItems.Count);
        }

        void UpsertStickers(int inventoryItemId, List<StickerInfo>? stickers)
        {
            if (stickers == null || stickers.Count == 0)
            {
                return;
            }

            var oldStickers = _context.Stickers.Where(s => s.InventoryItemId == inventoryItemId).ToList();
            if (oldStickers.Count > 0)
            {
                _context.Stickers.RemoveRange(oldStickers);
            }

            foreach (var sticker in stickers)
            {
                _context.Stickers.Add(new Sticker
                {
                    InventoryItemId = inventoryItemId,
                    Name = sticker.Name,
                    Price = sticker.Price,
                    Slot = sticker.Slot,
                    ImageUrl = sticker.ImageUrl
                });
            }
        }

        decimal ResolveMarketPrice(SteamInventoryItemDto steamItem, Skin matchingSkin)
        {
            if (!fetchMarketPrices)
            {
                return 0m;
            }

            if (marketPrices.TryGetValue(steamItem.MarketHashName, out var price) && price.HasValue)
            {
                var value = price.Value;
                _logger.LogDebug("Using market price for {MarketHashName}: ${Price}", steamItem.MarketHashName, value);

                if (value > SteamWalletLimit)
                {
                    _logger.LogInformation("Market price for {MarketHashName} exceeds Steam balance limit (${Limit}). Value: ${Price}",
                        steamItem.MarketHashName, SteamWalletLimit, value);
                }

                if (value > 0)
                {
                    matchingSkin.DefaultPrice = value;
                }

                return value;
            }

            _logger.LogDebug("No market price available for {MarketHashName}, setting to 0", steamItem.MarketHashName);
            return 0m;
        }

        foreach (var steamItem in steamItems)
        {
            try
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (!steamItem.Marketable && !steamItem.Tradable)
                {
                    _logger.LogDebug("Skipping non-marketable and non-tradable item: {MarketHashName}", steamItem.MarketHashName);
                    result.Skipped++;
                    result.SkippedItems.Add($"{steamItem.MarketHashName} (not marketable/tradable)");
                    continue;
                }

                var matchingSkin = FindMatchingSkin(allSkins, steamItem.MarketHashName);
                var trimmedMarketHashName = string.IsNullOrWhiteSpace(steamItem.MarketHashName)
                    ? null
                    : steamItem.MarketHashName.Trim();

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

                if (string.IsNullOrWhiteSpace(matchingSkin.MarketHashName) && !string.IsNullOrWhiteSpace(trimmedMarketHashName))
                {
                    matchingSkin.MarketHashName = trimmedMarketHashName;
                }

                InventoryItem? existingItem = null;
                if (!string.IsNullOrEmpty(steamItem.AssetId))
                {
                    existingItem = await _context.InventoryItems
                        .FirstOrDefaultAsync(i => i.AssetId == steamItem.AssetId, cancellationToken);
                }

                if (existingItem != null)
                {
                    _logger.LogDebug("Updating existing item with latest Steam data: AssetId {AssetId}, {MarketHashName}",
                        steamItem.AssetId, steamItem.MarketHashName);

                    var (updatedFloatValue, updatedExterior, updatedPaintSeed, updatedPaintIndex, updatedStickers) =
                        await ExtractItemPropertiesAsync(steamItem, cancellationToken);

                    var previousFloat = existingItem.Float;
                    var previousExterior = existingItem.Exterior;

                    if (!string.IsNullOrEmpty(steamItem.ImageUrl))
                    {
                        existingItem.ImageUrl = steamItem.ImageUrl;
                    }

                    if (HasMeaningfulFloat(updatedFloatValue))
                    {
                        existingItem.Float = updatedFloatValue;
                        if (!string.IsNullOrWhiteSpace(updatedExterior))
                        {
                            existingItem.Exterior = updatedExterior;
                        }
                    }

                    if (updatedPaintSeed.HasValue)
                    {
                        existingItem.PaintSeed = updatedPaintSeed;
                    }

                    existingItem.TradeProtected = !steamItem.Tradable;
                    existingItem.SteamMarketHashName = trimmedMarketHashName;

                    var price = ResolveMarketPrice(steamItem, matchingSkin);
                    if (price > 0 || (fetchMarketPrices && existingItem.Price == 0))
                    {
                        existingItem.Price = price;
                    }

                    UpsertStickers(existingItem.Id, updatedStickers);

                    await _context.SaveChangesAsync(cancellationToken);
                    result.Imported++;

                    _logger.LogInformation(
                        "Applied Steam properties to existing item {MarketHashName} ({AssetId}): float {OldFloat} -> {NewFloat}, exterior '{OldExterior}' -> '{NewExterior}'",
                        steamItem.MarketHashName,
                        steamItem.AssetId,
                        previousFloat,
                        existingItem.Float,
                        previousExterior,
                        existingItem.Exterior);

                    if (ShouldFetchInspectFloat(steamItem))
                    {
                        _inspectQueue.Enqueue(new InspectJob(
                            userId,
                            existingItem.Id,
                            steamItem.AssetId,
                            steamItem.InspectLink,
                            steamItem.MarketHashName,
                            steamItem.Name));
                    }
                    continue;
                }

                var (floatValue, exterior, paintSeed, paintIndex, stickers) = await ExtractItemPropertiesAsync(steamItem, cancellationToken);

                var imageUrl = !string.IsNullOrEmpty(steamItem.ImageUrl)
                    ? steamItem.ImageUrl
                    : matchingSkin.ImageUrl;

                var marketPrice = ResolveMarketPrice(steamItem, matchingSkin);

                var inventoryItem = new InventoryItem
                {
                    UserId = userId,
                    SkinId = matchingSkin.Id,
                    AssetId = steamItem.AssetId,
                    SteamMarketHashName = trimmedMarketHashName,
                    Float = NormalizeFloat(floatValue),
                    Exterior = exterior,
                    PaintSeed = paintSeed,
                    ImageUrl = imageUrl,
                    Price = marketPrice,
                    TradeProtected = !steamItem.Tradable,
                    AcquiredAt = DateTime.UtcNow
                };

                _context.InventoryItems.Add(inventoryItem);
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation(
                    "Created inventory item {MarketHashName} ({AssetId}) with float {Float} and exterior '{Exterior}'",
                    steamItem.MarketHashName,
                    steamItem.AssetId,
                    inventoryItem.Float,
                    inventoryItem.Exterior);

                UpsertStickers(inventoryItem.Id, stickers);
                if (stickers is { Count: > 0 })
                {
                    await _context.SaveChangesAsync(cancellationToken);
                }

                result.Imported++;

                if (ShouldFetchInspectFloat(steamItem))
                {
                    _inspectQueue.Enqueue(new InspectJob(
                        userId,
                        inventoryItem.Id,
                        steamItem.AssetId,
                        steamItem.InspectLink,
                        steamItem.MarketHashName,
                        steamItem.Name));
                }
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
    /// PRIORITIZES exact market_hash_name matching for accuracy
    /// </summary>
    private Skin? FindMatchingSkin(List<Skin> skins, string marketHashName)
    {
        if (string.IsNullOrWhiteSpace(marketHashName))
            return null;

        // Strategy 1: EXACT match on MarketHashName field (most accurate - Steam's exact identifier)
        var exactMarketHashMatch = skins.FirstOrDefault(s =>
            !string.IsNullOrEmpty(s.MarketHashName) &&
            s.MarketHashName.Equals(marketHashName, StringComparison.OrdinalIgnoreCase));
        if (exactMarketHashMatch != null)
        {
            _logger.LogDebug("Exact MarketHashName match found: {MarketHashName} -> {SkinName} (SkinId: {SkinId})", 
                marketHashName, exactMarketHashMatch.Name, exactMarketHashMatch.Id);
            return exactMarketHashMatch;
        }

        var normalizedSearch = NormalizeSkinName(marketHashName);
        if (string.IsNullOrWhiteSpace(normalizedSearch))
            return null;

        // Strategy 2: Exact match on Name field (case-insensitive)
        var exactNameMatch = skins.FirstOrDefault(s =>
            s.Name.Equals(marketHashName, StringComparison.OrdinalIgnoreCase));
        if (exactNameMatch != null)
        {
            _logger.LogDebug("Exact name match found: {MarketHashName} -> {SkinName}", marketHashName, exactNameMatch.Name);
            return exactNameMatch;
        }

        // Strategy 3: Exact match on normalized name
        var exactNormalizedMatch = skins.FirstOrDefault(s =>
            NormalizeSkinName(s.Name).Equals(normalizedSearch, StringComparison.OrdinalIgnoreCase));
        if (exactNormalizedMatch != null)
        {
            _logger.LogDebug("Exact normalized match found: {MarketHashName} -> {SkinName}", marketHashName, exactNormalizedMatch.Name);
            return exactNormalizedMatch;
        }

        // Strategy 4: Contains match (either direction) - WARNING: Less reliable, may cause mismatches
        var containsMatch = skins.FirstOrDefault(s =>
        {
            var normalizedSkin = NormalizeSkinName(s.Name);
            return normalizedSkin.Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase) ||
                   normalizedSearch.Contains(normalizedSkin, StringComparison.OrdinalIgnoreCase);
        });
        if (containsMatch != null)
        {
            _logger.LogWarning("Contains match found (may be inaccurate): {MarketHashName} -> {SkinName}. " +
                "Consider refreshing catalog from Steam to get exact MarketHashName.", 
                marketHashName, containsMatch.Name);
            return containsMatch;
        }

        // Strategy 5: Word-based fuzzy matching - WARNING: Least reliable, may cause mismatches
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
                _logger.LogWarning("Fuzzy match found (score: {Score}, may be inaccurate): {MarketHashName} -> {SkinName}. " +
                    "Consider refreshing catalog from Steam to get exact MarketHashName.", 
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
    private async Task<(double floatValue, string exterior, int? paintSeed, int? paintIndex, List<StickerInfo>? stickers)> ExtractItemPropertiesAsync(
        SteamInventoryItemDto steamItem, 
        CancellationToken cancellationToken = default)
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
                var value = desc.Value ?? string.Empty;
                
                // Extract float value
                if (TryExtractFloatValue(value, out var parsedFloat))
                {
                    floatValue = parsedFloat;
                    exterior = GetExteriorFromFloat(floatValue);
                    _logger.LogInformation(
                        "Parsed float {Float} from Steam description for {MarketHashName} ({AssetId})",
                        floatValue,
                        steamItem.MarketHashName,
                        steamItem.AssetId);
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

        // Extract stickers from tags
        // Steam API provides stickers in the Tags array with Category == "Sticker"
        // The order of sticker tags typically corresponds to their slot positions (0-4)
        if (steamItem.Tags != null)
        {
            var stickerTags = steamItem.Tags
                .Where(t => t.Category == "Sticker")
                .ToList();

            var exteriorTag = steamItem.Tags
                .FirstOrDefault(t => t.Category.Equals("Exterior", StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(exteriorTag?.LocalizedTagName))
            {
                exterior = exteriorTag.LocalizedTagName.Trim();
                _logger.LogInformation(
                    "Using Steam exterior tag '{Exterior}' for {MarketHashName} ({AssetId})",
                    exterior,
                    steamItem.MarketHashName,
                    steamItem.AssetId);
            }
            
            if (stickerTags.Count > 0)
            {
                stickers = new List<StickerInfo>();
                
                // Collect all sticker names first for batch lookup
                var stickerNames = stickerTags
                    .Take(5) // Max 5 stickers (CS:GO/CS2 limit)
                    .Select(t => t.LocalizedTagName)
                    .ToList();
                
                // Batch fetch sticker info (images and prices) from catalog
                Dictionary<string, StickerCatalogService.StickerInfo>? stickerInfoMap = null;
                if (_stickerCatalogService != null)
                {
                    try
                    {
                        stickerInfoMap = await _stickerCatalogService.GetStickerInfoBatchAsync(stickerNames, cancellationToken);
                        _logger.LogDebug("Fetched sticker info for {Found}/{Total} stickers", 
                            stickerInfoMap.Count, stickerNames.Count);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error fetching sticker catalog info, continuing without images/prices");
                    }
                }
                
                // Steam provides stickers in order, typically matching slot positions
                // However, we use the index as slot since Steam doesn't explicitly provide slot numbers
                for (int i = 0; i < stickerTags.Count && i < 5; i++)
                {
                    var tag = stickerTags[i];
                    var stickerName = tag.LocalizedTagName;
                    
                    // Get sticker info from catalog if available
                    string? stickerImageUrl = null;
                    decimal? stickerPrice = null;
                    
                    if (stickerInfoMap != null && stickerInfoMap.TryGetValue(stickerName, out var catalogInfo))
                    {
                        stickerImageUrl = catalogInfo.ImageUrl;
                        stickerPrice = catalogInfo.Price;
                    }
                    
                    stickers.Add(new StickerInfo
                    {
                        Name = stickerName,
                        Slot = i, // Slot 0-4 (CS:GO/CS2 has 4 sticker slots)
                        Price = stickerPrice,
                        ImageUrl = stickerImageUrl
                    });
                }
                
                _logger.LogDebug("Extracted {Count} stickers for item: {StickerNames}", 
                    stickers.Count, string.Join(", ", stickers.Select(s => s.Name)));
            }
        }

        if (Math.Abs(floatValue - 0.5) < 0.0001)
        {
            var descriptionPreview = steamItem.Descriptions?
                .Where(d => !string.IsNullOrWhiteSpace(d.Value))
                .Take(3)
                .Select(d => $"{d.Type}: {d.Value}")
                .ToList();

            var tagPreview = steamItem.Tags?
                .Where(t => !string.IsNullOrWhiteSpace(t.LocalizedTagName))
                .Take(5)
                .Select(t => $"{t.Category}: {t.LocalizedTagName}")
                .ToList();

            _logger.LogInformation(
                "Steam data for {MarketHashName} ({AssetId}) did not include a float; keeping default {Float}. Descriptions: {Descriptions}. Tags: {Tags}",
                steamItem.MarketHashName,
                steamItem.AssetId,
                floatValue,
                descriptionPreview is { Count: > 0 } ? string.Join(" | ", descriptionPreview) : "(none)",
                tagPreview is { Count: > 0 } ? string.Join(" | ", tagPreview) : "(none)");
        }
#region agent log
        DebugLog(
            hypothesisId: "H1",
            location: "SteamInventoryImportService.ExtractItemPropertiesAsync",
            message: "Extracted Steam properties",
            data: new
            {
                steamItem.AssetId,
                steamItem.MarketHashName,
                floatValue,
                exterior,
                paintSeed,
                paintIndex
            });
#endregion

        return (floatValue, exterior, paintSeed, paintIndex, stickers);
    }

    private static bool ShouldFetchInspectFloat(SteamInventoryItemDto item)
    {
        if (string.IsNullOrWhiteSpace(item.InspectLink))
        {
            return false;
        }

        var type = item.Type ?? string.Empty;
        var name = item.Name ?? string.Empty;

        if (type.Contains("Case", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Container", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Sticker", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Patch", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Pin", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Music", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Graffiti", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Collectible", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Coin", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Medal", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Badge", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Charm", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (type.Contains("Agent", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (name.Contains("Case", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Sticker", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Patch", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Music Kit", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Pin", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Graffiti", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Coin", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Medal", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Badge", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("Charm", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }

    private static bool TryExtractFloatValue(string rawValue, out double parsedFloat)
    {
        parsedFloat = 0.5;
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return false;
        }

        var decoded = WebUtility.HtmlDecode(rawValue);
        var normalized = Regex.Replace(decoded, "<.*?>", " ");
        normalized = normalized.Replace("\n", " ").Replace("\\n", " ");

        if (!normalized.Contains("float", StringComparison.OrdinalIgnoreCase) &&
            !normalized.Contains("wear", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var numberMatches = Regex.Matches(normalized, @"-?\d+[.,]?\d*");
        foreach (Match match in numberMatches)
        {
            var numericPart = match.Value.Replace(" ", string.Empty);

            if (numericPart.Contains(',') && numericPart.Contains('.'))
            {
                var lastComma = numericPart.LastIndexOf(',');
                var lastDot = numericPart.LastIndexOf('.');
                if (lastComma > lastDot)
                {
                    numericPart = numericPart.Replace(".", string.Empty)
                                             .Replace(',', '.');
                }
                else
                {
                    numericPart = numericPart.Replace(",", string.Empty);
                }
            }
            else if (numericPart.Contains(',') && !numericPart.Contains('.'))
            {
                numericPart = numericPart.Replace(',', '.');
            }
            else
            {
                numericPart = numericPart.Replace(",", string.Empty);
            }

            if (double.TryParse(numericPart, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var candidate))
            {
                if (candidate >= 0 && candidate <= 1)
                {
                    parsedFloat = candidate;
                    return true;
                }
            }
        }

        return false;
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
    public string? Type { get; set; }
    public string? ImageUrl { get; set; }
    public bool Marketable { get; set; }
    public bool Tradable { get; set; }
    public string? InspectLink { get; set; }
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
