using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public record SkinImportResult(bool Success, int TotalProcessed, int Created, int Updated, string Message);

public record CsFloatImportResult(bool Success, int TotalProcessed, int Imported, int Updated, int Skipped, string Message);

public class SkinImportService
{
    private static readonly string[] ByMykelItemTypes =
    [
        "skins",
        "knives",
        "gloves",
        "agents",
        "stickers",
        "graffiti",
        "patches",
        "music_kits",
        "collectibles",
        "crates",
        "keys",
        "keychains",
        "tools"
    ];

    private const string ByMykelBaseUrl = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en";

    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly DopplerPhaseService _dopplerPhaseService;
    private readonly ILogger<SkinImportService> _logger;

    public SkinImportService(
        ApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        DopplerPhaseService dopplerPhaseService,
        ILogger<SkinImportService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _dopplerPhaseService = dopplerPhaseService;
        _logger = logger;
    }

    public async Task<SkinImportResult> ImportFromByMykelAsync(CancellationToken cancellationToken = default)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromMinutes(5);

        var totalProcessed = 0;
        var totalCreated = 0;
        var totalUpdated = 0;

        foreach (var itemType in ByMykelItemTypes)
        {
            _logger.LogInformation("Fetching {ItemType} from ByMykel API…", itemType);

            HttpResponseMessage response;
            try
            {
                response = await httpClient.GetAsync($"{ByMykelBaseUrl}/{itemType}.json", cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch {ItemType} from ByMykel API", itemType);
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("ByMykel API returned {StatusCode} for {ItemType}", response.StatusCode, itemType);
                continue;
            }

            var jsonContent = await response.Content.ReadAsStringAsync(cancellationToken);
            List<JsonElement>? items;

            try
            {
                items = JsonSerializer.Deserialize<List<JsonElement>>(jsonContent);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize {ItemType} payload from ByMykel", itemType);
                continue;
            }

            if (items == null || items.Count == 0)
            {
                _logger.LogWarning("No {ItemType} entries returned from ByMykel", itemType);
                continue;
            }

            _logger.LogInformation("Processing {Count} {ItemType} entries", items.Count, itemType);

            foreach (var item in items)
            {
                cancellationToken.ThrowIfCancellationRequested();
                totalProcessed++;

                try
                {
                    var skinName = item.GetProperty("name").GetString() ?? "Unknown";
                    var marketHashName = item.TryGetProperty("market_hash_name", out var mhn) 
                        ? mhn.GetString() 
                        : null; // ByMykel may provide market_hash_name
                    var rarity = GetStringFromProperty(item, "rarity");
                    var collection = GetCollectionName(item);
                    var weapon = GetStringFromProperty(item, "weapon");
                    var imageUrl = item.TryGetProperty("image", out var img) ? img.GetString() : "";
                    var rawPhase = GetStringFromProperty(item, "phase");
                    var paintIndex = GetIntFromProperty(item, "paint_index");
                    var dopplerInfo = _dopplerPhaseService.GetPhaseInfo(paintIndex);
                    if (dopplerInfo?.ImageUrl is { } dopplerImage && string.IsNullOrWhiteSpace(imageUrl))
                    {
                        imageUrl = dopplerImage;
                    }
                    var type = DetermineTypeFromCategory(itemType, weapon);

                    if (dopplerInfo != null)
                    {
                        var displayName = $"{skinName} ({dopplerInfo.Phase})";
                        await TryRenameSkinAsync(skinName, paintIndex, displayName, cancellationToken);
                        var wasUpdate = await UpsertSkinAsync(
                            displayName,
                            rarity,
                            type,
                            collection,
                            weapon,
                            imageUrl,
                            paintIndex,
                            marketHashName,
                            cancellationToken);

                        if (wasUpdate)
                        {
                            totalUpdated++;
                        }
                        else
                        {
                            totalCreated++;
                        }
                    }
                    else
                    {
                        var family = DetermineDopplerFamily(skinName);
                        var handledFamily = false;

                        if (!string.IsNullOrWhiteSpace(family) &&
                            string.Equals(type, "Knife", StringComparison.OrdinalIgnoreCase))
                        {
                            var phases = _dopplerPhaseService
                                .GetFamilyPhases(family!, weapon)
                                .ToList();

                            if (phases.Count > 0)
                            {
                                handledFamily = true;
                                foreach (var phase in phases)
                                {
                                    var phaseDisplayName = $"{skinName} ({phase.Phase})";
                                    var phaseImage = string.IsNullOrWhiteSpace(phase.ImageUrl) ? imageUrl : phase.ImageUrl;
                                    await TryRenameSkinAsync(skinName, phase.PaintSeed, phaseDisplayName, cancellationToken);
                                    var wasUpdate = await UpsertSkinAsync(
                                        phaseDisplayName,
                                        rarity,
                                        type,
                                        collection,
                                        weapon,
                                        phaseImage,
                                        phase.PaintSeed,
                                        marketHashName,
                                        cancellationToken);

                                    if (wasUpdate)
                                    {
                                        totalUpdated++;
                                    }
                                    else
                                    {
                                        totalCreated++;
                                    }
                                }
                            }
                        }

                        if (!handledFamily)
                        {
                            var baseDisplayName = !string.IsNullOrWhiteSpace(rawPhase)
                                ? $"{skinName} ({rawPhase})"
                                : skinName;

                            await TryRenameSkinAsync(skinName, paintIndex, baseDisplayName, cancellationToken);
                            var wasUpdate = await UpsertSkinAsync(
                                baseDisplayName,
                                rarity,
                                type,
                                collection,
                                weapon,
                                imageUrl,
                                paintIndex,
                                marketHashName,
                                cancellationToken);

                            if (wasUpdate)
                            {
                                totalUpdated++;
                            }
                            else
                            {
                                totalCreated++;
                            }
                        }
                    }

                    if (totalProcessed % 100 == 0)
                    {
                        await _context.SaveChangesAsync(cancellationToken);
                        _logger.LogInformation("Saved batch at {TotalProcessed} processed (Created: {Created}, Updated: {Updated})",
                            totalProcessed, totalCreated, totalUpdated);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error processing ByMykel item during import");
                }
            }
        }

        await DeduplicateSkinsAsync(cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var message = $"Successfully processed {totalProcessed} records ({totalCreated} created, {totalUpdated} updated)";
        _logger.LogInformation(message);

        return new SkinImportResult(true, totalProcessed, totalCreated, totalUpdated, message);
    }

    public async Task<CsFloatImportResult> ImportFromCsFloatAsync(CancellationToken cancellationToken = default)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromMinutes(5);

        try
        {
            var response = await httpClient.GetStringAsync("https://csfloat.com/api/v1/items", cancellationToken);
            var csfloatItems = JsonSerializer.Deserialize<List<CsFloatItemDto>>(response);

            if (csfloatItems == null || csfloatItems.Count == 0)
            {
                return new CsFloatImportResult(false, 0, 0, 0, 0, "No items received from CSFloat");
            }

            var imported = 0;
            var updated = 0;
            var skipped = 0;

            foreach (var item in csfloatItems)
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    skipped++;
                    continue;
                }

                try
                {
                    var existingSkin = await _context.Skins
                        .FirstOrDefaultAsync(s => s.Name == item.Name, cancellationToken);

                    if (existingSkin != null)
                    {
                        existingSkin.Rarity = item.Rarity ?? existingSkin.Rarity;
                        existingSkin.Type = item.Category ?? DetermineType(item.Name);
                        existingSkin.Collection = item.Collection;
                        existingSkin.Weapon = item.Weapon;
                        existingSkin.ImageUrl = item.ImageUrl ?? existingSkin.ImageUrl;
                        existingSkin.DefaultPrice = GetDefaultPriceForRarity(item.Rarity);
                        updated++;
                    }
                    else
                    {
                        var newSkin = new Skin
                        {
                            Name = item.Name,
                            Rarity = item.Rarity ?? "Unknown",
                            Type = item.Category ?? DetermineType(item.Name),
                            Collection = item.Collection,
                            Weapon = item.Weapon ?? ExtractWeapon(item.Name),
                            ImageUrl = item.ImageUrl,
                            DefaultPrice = GetDefaultPriceForRarity(item.Rarity)
                        };

                        await _context.Skins.AddAsync(newSkin, cancellationToken);
                        imported++;
                    }

                    if ((imported + updated) % 100 == 0)
                    {
                        await _context.SaveChangesAsync(cancellationToken);
                        _logger.LogInformation("CSFloat progress: {Imported} imported, {Updated} updated", imported, updated);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error processing CSFloat item {ItemName}", item.Name);
                    skipped++;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            var message = $"CSFloat import complete: {imported} new, {updated} updated, {skipped} skipped";
            _logger.LogInformation(message);

            return new CsFloatImportResult(true, csfloatItems.Count, imported, updated, skipped, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import from CSFloat");
            return new CsFloatImportResult(false, 0, 0, 0, 0, $"Failed to import from CSFloat: {ex.Message}");
        }
    }

    private async Task DeduplicateSkinsAsync(CancellationToken cancellationToken)
    {
        var skinKeys = await _context.Skins
            .AsNoTracking()
            .Select(s => new { s.Id, s.Name })
            .ToListAsync(cancellationToken);

        var duplicateIds = skinKeys
            .GroupBy(s => s.Name)
            .SelectMany(g => g.OrderBy(s => s.Id).Skip(1).Select(s => s.Id))
            .ToList();

        if (duplicateIds.Count > 0)
        {
            var redundant = await _context.Skins
                .Where(s => duplicateIds.Contains(s.Id))
                .ToListAsync(cancellationToken);

            if (redundant.Count > 0)
            {
                _context.Skins.RemoveRange(redundant);
            }
        }
    }

    private async Task<bool> UpsertSkinAsync(
        string name,
        string rarity,
        string type,
        string? collection,
        string? weapon,
        string? imageUrl,
        int? paintIndex,
        string? marketHashName,
        CancellationToken cancellationToken)
    {
        var existingSkin = await _context.Skins
            .FirstOrDefaultAsync(s => s.Name == name, cancellationToken);

        if (existingSkin != null)
        {
            existingSkin.Rarity = rarity;
            existingSkin.Type = type;
            existingSkin.Collection = collection;
            existingSkin.Weapon = weapon;
            if (!string.IsNullOrWhiteSpace(imageUrl))
            {
                existingSkin.ImageUrl = imageUrl;
            }
            // Update MarketHashName if provided and not already set (Steam data is more authoritative)
            if (!string.IsNullOrWhiteSpace(marketHashName) && string.IsNullOrEmpty(existingSkin.MarketHashName))
            {
                existingSkin.MarketHashName = marketHashName;
            }
            existingSkin.DefaultPrice = GetDefaultPriceForRarity(rarity);
            if (paintIndex.HasValue)
            {
                existingSkin.PaintIndex = paintIndex.Value;
            }
            return true;
        }

        var newSkin = new Skin
        {
            Name = name,
            Rarity = rarity,
            Type = type,
            Collection = collection,
            Weapon = weapon,
            ImageUrl = imageUrl ?? "",
            MarketHashName = marketHashName, // Store market hash name if available from ByMykel
            DefaultPrice = GetDefaultPriceForRarity(rarity),
            PaintIndex = paintIndex
        };

        await _context.Skins.AddAsync(newSkin, cancellationToken);
        return false;
    }

    private async Task TryRenameSkinAsync(string originalName, int? paintIndex, string newName, CancellationToken cancellationToken)
    {
        var query = _context.Skins.AsQueryable().Where(s => s.Name == originalName);
        if (paintIndex.HasValue)
        {
            query = query.Where(s => s.PaintIndex == paintIndex.Value || s.PaintIndex == null);
        }

        var existing = await query.FirstOrDefaultAsync(cancellationToken);
        if (existing != null)
        {
            var targetQuery = _context.Skins.AsQueryable().Where(s => s.Name == newName);
            if (paintIndex.HasValue)
            {
                targetQuery = targetQuery.Where(s => s.PaintIndex == paintIndex.Value);
            }

            var target = await targetQuery.FirstOrDefaultAsync(cancellationToken);
            if (target != null)
            {
                _context.Skins.Remove(existing);
                return;
            }

            existing.Name = newName;
            if (paintIndex.HasValue)
            {
                existing.PaintIndex = paintIndex.Value;
            }
        }
    }

    private static string? DetermineDopplerFamily(string skinName)
    {
        if (skinName.Contains("Gamma Doppler", StringComparison.OrdinalIgnoreCase))
        {
            return "gammaDoppler";
        }

        if (skinName.Contains("Doppler", StringComparison.OrdinalIgnoreCase))
        {
            return "doppler";
        }

        return null;
    }

    private static string GetStringFromProperty(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return "";
        }

        if (prop.ValueKind == JsonValueKind.String)
        {
            return prop.GetString() ?? "";
        }

        if (prop.ValueKind == JsonValueKind.Object && prop.TryGetProperty("name", out var nameProp))
        {
            return nameProp.GetString() ?? "";
        }

        return "";
    }

    private static string GetCollectionName(JsonElement element)
    {
        if (!element.TryGetProperty("collections", out var collections))
        {
            return "";
        }

        if (collections.ValueKind == JsonValueKind.Array && collections.GetArrayLength() > 0)
        {
            var firstCollection = collections[0];
            if (firstCollection.ValueKind == JsonValueKind.Object && firstCollection.TryGetProperty("name", out var name))
            {
                return name.GetString() ?? "";
            }
        }

        return "";
    }

    private static string DetermineTypeFromCategory(string category, string weapon)
    {
        return category.ToLower() switch
        {
            "knives" => "Knife",
            "gloves" => "Gloves",
            "stickers" => "Sticker",
            "graffiti" => "Graffiti",
            "patches" => "Patch",
            "music_kits" => "Music Kit",
            "collectibles" => "Collectible",
            "crates" => "Case",
            "keys" => "Key",
            "keychains" => "Keychain",
            "tools" => "Tool",
            "agents" => "Agent",
            "skins" when !string.IsNullOrEmpty(weapon) => weapon switch
            {
                string w when w.Contains("AK-47", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("M4A4", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("M4A1-S", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("AWP", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("Galil", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("FAMAS", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("AUG", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("SG 553", StringComparison.OrdinalIgnoreCase)
                    => "Rifle",
                string w when w.Contains("Glock", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("USP-S", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("P2000", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("P250", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("Five-SeveN", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("CZ75", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("Tec-9", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("Desert Eagle", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("Dual Berettas", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("R8", StringComparison.OrdinalIgnoreCase)
                    => "Pistol",
                string w when w.Contains("MAC-10", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("MP9", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("MP7", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("MP5-SD", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("UMP-45", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("P90", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("PP-Bizon", StringComparison.OrdinalIgnoreCase)
                    => "SMG",
                string w when w.Contains("Nova", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("XM1014", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("Sawed-Off", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("MAG-7", StringComparison.OrdinalIgnoreCase)
                    => "Shotgun",
                string w when w.Contains("M249", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("Negev", StringComparison.OrdinalIgnoreCase)
                    => "Machine Gun",
                string w when w.Contains("AWP", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("SSG 08", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("SCAR-20", StringComparison.OrdinalIgnoreCase)
                    || w.Contains("G3SG1", StringComparison.OrdinalIgnoreCase)
                    => "Sniper Rifle",
                _ => "Rifle"
            },
            _ => "Other"
        };
    }

    private static int? GetIntFromProperty(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }

        try
        {
            return prop.ValueKind switch
            {
                JsonValueKind.Number when prop.TryGetInt32(out var intValue) => intValue,
                JsonValueKind.String when int.TryParse(prop.GetString(), out var parsed) => parsed,
                _ => (int?)null
            };
        }
        catch
        {
            return null;
        }
    }

    private static decimal? GetDefaultPriceForRarity(string? rarity)
    {
        return rarity switch
        {
            "Consumer Grade" => 0.10m,
            "Industrial Grade" => 0.25m,
            "Mil-Spec" or "Mil-Spec Grade" => 1.00m,
            "Restricted" => 5.00m,
            "Classified" => 15.00m,
            "Covert" => 50.00m,
            "Extraordinary" => 200.00m,
            "Contraband" => 1000.00m,
            _ => null
        };
    }

    private static string DetermineType(string name)
    {
        if (name.Contains("Knife", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Karambit", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Bayonet", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Butterfly", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Flip", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Gut", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Huntsman", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Falchion", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Bowie", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Shadow Daggers", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Paracord", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Survival", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Ursus", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Navaja", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Stiletto", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Talon", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Classic", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Nomad", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Skeleton", StringComparison.OrdinalIgnoreCase))
        {
            return "Knife";
        }

        if (name.Contains("Gloves", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Hand Wraps", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Driver Gloves", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Moto Gloves", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Specialist Gloves", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Sport Gloves", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Bloodhound Gloves", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Hydra Gloves", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Broken Fang", StringComparison.OrdinalIgnoreCase))
        {
            return "Gloves";
        }

        if (name.Contains("Sticker", StringComparison.OrdinalIgnoreCase))
        {
            return "Sticker";
        }

        if (name.Contains("Case", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Capsule", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Package", StringComparison.OrdinalIgnoreCase))
        {
            return "Case";
        }

        if (name.Contains("Pin", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Collectible", StringComparison.OrdinalIgnoreCase))
        {
            return "Collectible";
        }

        if (name.Contains("Music Kit", StringComparison.OrdinalIgnoreCase))
        {
            return "Music Kit";
        }

        if (name.Contains("Patch", StringComparison.OrdinalIgnoreCase))
        {
            return "Patch";
        }

        if (name.Contains("Agent", StringComparison.OrdinalIgnoreCase))
        {
            return "Agent";
        }

        if (name.Contains("AK-47", StringComparison.OrdinalIgnoreCase)
            || name.Contains("M4A4", StringComparison.OrdinalIgnoreCase)
            || name.Contains("M4A1-S", StringComparison.OrdinalIgnoreCase)
            || name.Contains("FAMAS", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Galil", StringComparison.OrdinalIgnoreCase)
            || name.Contains("AUG", StringComparison.OrdinalIgnoreCase)
            || name.Contains("SG 553", StringComparison.OrdinalIgnoreCase))
        {
            return "Rifle";
        }

        if (name.Contains("AWP", StringComparison.OrdinalIgnoreCase)
            || name.Contains("SSG 08", StringComparison.OrdinalIgnoreCase)
            || name.Contains("G3SG1", StringComparison.OrdinalIgnoreCase)
            || name.Contains("SCAR-20", StringComparison.OrdinalIgnoreCase))
        {
            return "Sniper Rifle";
        }

        if (name.Contains("Glock", StringComparison.OrdinalIgnoreCase)
            || name.Contains("USP-S", StringComparison.OrdinalIgnoreCase)
            || name.Contains("P2000", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Desert Eagle", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Five-SeveN", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Tec-9", StringComparison.OrdinalIgnoreCase)
            || name.Contains("CZ75", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Dual Berettas", StringComparison.OrdinalIgnoreCase)
            || name.Contains("P250", StringComparison.OrdinalIgnoreCase)
            || name.Contains("R8", StringComparison.OrdinalIgnoreCase))
        {
            return "Pistol";
        }

        if (name.Contains("MP9", StringComparison.OrdinalIgnoreCase)
            || name.Contains("MAC-10", StringComparison.OrdinalIgnoreCase)
            || name.Contains("MP7", StringComparison.OrdinalIgnoreCase)
            || name.Contains("UMP-45", StringComparison.OrdinalIgnoreCase)
            || name.Contains("P90", StringComparison.OrdinalIgnoreCase)
            || name.Contains("PP-Bizon", StringComparison.OrdinalIgnoreCase)
            || name.Contains("MP5-SD", StringComparison.OrdinalIgnoreCase))
        {
            return "SMG";
        }

        if (name.Contains("Nova", StringComparison.OrdinalIgnoreCase)
            || name.Contains("XM1014", StringComparison.OrdinalIgnoreCase)
            || name.Contains("MAG-7", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Sawed-Off", StringComparison.OrdinalIgnoreCase))
        {
            return "Shotgun";
        }

        if (name.Contains("M249", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Negev", StringComparison.OrdinalIgnoreCase))
        {
            return "Machine Gun";
        }

        return "Other";
    }

    private static string? ExtractWeapon(string name)
    {
        var parts = name.Split('|');
        if (parts.Length > 0)
        {
            return parts[0].Trim();
        }

        return null;
    }

    private sealed class CsFloatItemDto
    {
        [JsonPropertyName("market_hash_name")]
        public string? MarketHashName { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("rarity")]
        public string? Rarity { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("weapon")]
        public string? Weapon { get; set; }

        [JsonPropertyName("collection")]
        public string? Collection { get; set; }

        [JsonPropertyName("image")]
        public string? ImageUrl { get; set; }
    }
}


