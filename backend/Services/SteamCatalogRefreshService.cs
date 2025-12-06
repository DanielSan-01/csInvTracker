using System.Text.Json;
using System.Text.RegularExpressions;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class SteamCatalogRefreshService
{
    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SteamCatalogRefreshService> _logger;
    private readonly DopplerPhaseService _dopplerPhaseService;

    public SteamCatalogRefreshService(
        ApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        DopplerPhaseService dopplerPhaseService,
        ILogger<SteamCatalogRefreshService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _dopplerPhaseService = dopplerPhaseService;
        _logger = logger;
    }

    public class RefreshResult
    {
        public int TotalItemsFound { get; set; }
        public int Created { get; set; }
        public int Updated { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = new();
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>
    /// Refreshes the catalog by fetching items from Steam inventories
    /// Aggregates unique items from all user inventories in the system
    /// </summary>
    public async Task<RefreshResult> RefreshFromSteamInventoriesAsync(CancellationToken cancellationToken = default)
    {
        var result = new RefreshResult();
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromMinutes(10);

        try
        {
            // Get all users with Steam IDs
            var users = await _context.Users
                .Where(u => !string.IsNullOrEmpty(u.SteamId))
                .ToListAsync(cancellationToken);

            if (users.Count == 0)
            {
                result.Message = "No users with Steam IDs found. Cannot refresh catalog.";
                return result;
            }

            _logger.LogInformation("Found {Count} users with Steam IDs. Fetching inventories...", users.Count);

            // Dictionary to store unique items by market_hash_name
            var uniqueItems = new Dictionary<string, SteamItemData>();

            // Fetch inventory from each user (limit to first 50 users to avoid timeout)
            var usersToProcess = users.Take(50).ToList();
            foreach (var user in usersToProcess)
            {
                try
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    // Use base URL without query parameters (works better)
                    var inventoryUrl = $"https://steamcommunity.com/inventory/{user.SteamId}/730/2";
                    _logger.LogDebug("Fetching inventory for user {UserId} (SteamId: {SteamId})", user.Id, user.SteamId);

                    var response = await httpClient.GetAsync(inventoryUrl, cancellationToken);
                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("Failed to fetch inventory for user {UserId}: {StatusCode}", user.Id, response.StatusCode);
                        continue;
                    }

                    var json = await response.Content.ReadAsStringAsync(cancellationToken);
                    
                    // Handle null response from Steam
                    if (string.IsNullOrWhiteSpace(json) || json.Trim().Equals("null", StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogDebug("Steam returned null response for user {UserId} (inventory may be empty or private)", user.Id);
                        continue;
                    }
                    
                    var inventoryData = JsonSerializer.Deserialize<SteamInventoryResponse>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (inventoryData?.Success != 1 || inventoryData.Descriptions == null)
                    {
                        _logger.LogDebug("No valid inventory data for user {UserId}", user.Id);
                        continue;
                    }

                    // Process each unique item description
                    foreach (var desc in inventoryData.Descriptions)
                    {
                        if (string.IsNullOrEmpty(desc.MarketHashName))
                            continue;

                        // Use market_hash_name as the unique key
                        if (!uniqueItems.ContainsKey(desc.MarketHashName))
                        {
                            uniqueItems[desc.MarketHashName] = new SteamItemData
                            {
                                MarketHashName = desc.MarketHashName,
                                Name = desc.Name,
                                ImageUrl = desc.IconUrl != null
                                    ? $"https://community.fastly.steamstatic.com/economy/image/{desc.IconUrl}/330x192?allow_animated=1"
                                    : null,
                                Type = desc.Type,
                                Tags = desc.Tags ?? new List<SteamTag>(),
                                Descriptions = desc.Descriptions ?? new List<SteamDescription>()
                            };
                        }
                    }

                    _logger.LogDebug("Processed inventory for user {UserId}. Found {Count} unique items so far.", 
                        user.Id, uniqueItems.Count);

                    // Small delay to avoid rate limiting
                    await Task.Delay(500, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error fetching inventory for user {UserId}", user.Id);
                    result.Errors.Add($"Error processing user {user.Id}: {ex.Message}");
                }
            }

            result.TotalItemsFound = uniqueItems.Count;
            _logger.LogInformation("Found {Count} unique items from Steam inventories. Updating catalog...", uniqueItems.Count);

            // Update catalog with items from Steam
            foreach (var item in uniqueItems.Values)
            {
                try
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    // Extract metadata from tags
                    var rarity = ExtractRarity(item.Tags);
                    var weapon = ExtractWeapon(item.Tags, item.Name);
                    var type = DetermineType(item.Tags, item.Type, item.Name);
                    var collection = ExtractCollection(item.Tags, item.Descriptions);

                    // Extract paint index for Doppler phases
                    int? paintIndex = ExtractPaintIndex(item.Descriptions);

                    // Find or create skin
                    var existingSkin = await _context.Skins
                        .FirstOrDefaultAsync(s => s.Name == item.MarketHashName, cancellationToken);

                    if (existingSkin != null)
                    {
                        // Update existing skin with Steam's latest data
                        var wasUpdated = false;

                        // TODO: Re-enable after migration is applied
                        // Always update market_hash_name if it's missing or different
                        // if (!string.IsNullOrEmpty(item.MarketHashName) && existingSkin.MarketHashName != item.MarketHashName)
                        // {
                        //     existingSkin.MarketHashName = item.MarketHashName;
                        //     wasUpdated = true;
                        // }

                        // Always update image URL from Steam (Steam has the latest images)
                        if (!string.IsNullOrEmpty(item.ImageUrl) && existingSkin.ImageUrl != item.ImageUrl)
                        {
                            existingSkin.ImageUrl = item.ImageUrl;
                            wasUpdated = true;
                        }

                        if (!string.IsNullOrEmpty(rarity) && existingSkin.Rarity != rarity)
                        {
                            existingSkin.Rarity = rarity;
                            wasUpdated = true;
                        }

                        if (!string.IsNullOrEmpty(type) && existingSkin.Type != type)
                        {
                            existingSkin.Type = type;
                            wasUpdated = true;
                        }

                        if (!string.IsNullOrEmpty(weapon) && existingSkin.Weapon != weapon)
                        {
                            existingSkin.Weapon = weapon;
                            wasUpdated = true;
                        }

                        if (wasUpdated)
                        {
                            result.Updated++;
                            _logger.LogDebug("Updated skin: {Name} (MarketHashName: {MarketHashName})", 
                                existingSkin.Name, item.MarketHashName);
                        }
                        else
                        {
                            result.Skipped++;
                        }
                    }
                    else
                    {
                        // Create new skin from Steam data
                        var newSkin = new Skin
                        {
                            Name = item.MarketHashName,
                            // MarketHashName = item.MarketHashName, // TODO: Re-enable after migration is applied
                            Rarity = rarity ?? "Unknown",
                            Type = type ?? "Unknown",
                            Weapon = weapon,
                            ImageUrl = item.ImageUrl,
                            DefaultPrice = GetDefaultPriceForRarity(rarity),
                            PaintIndex = paintIndex
                        };

                        await _context.Skins.AddAsync(newSkin, cancellationToken);
                        result.Created++;
                        _logger.LogDebug("Created new skin from Steam: {Name} (MarketHashName: {MarketHashName})", 
                            item.MarketHashName, item.MarketHashName);
                    }

                    // Save in batches
                    if ((result.Created + result.Updated) % 100 == 0)
                    {
                        await _context.SaveChangesAsync(cancellationToken);
                        _logger.LogInformation("Saved batch. Created: {Created}, Updated: {Updated}", 
                            result.Created, result.Updated);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing item: {MarketHashName}", item.MarketHashName);
                    result.Errors.Add($"Error processing {item.MarketHashName}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            result.Message = $"Catalog refresh complete. Found {result.TotalItemsFound} unique items. " +
                           $"Created {result.Created}, Updated {result.Updated}, Skipped {result.Skipped}.";
            
            _logger.LogInformation(result.Message);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing catalog from Steam");
            result.Errors.Add($"Fatal error: {ex.Message}");
            result.Message = $"Catalog refresh failed: {ex.Message}";
            return result;
        }
    }

    private string? ExtractRarity(List<SteamTag> tags)
    {
        var rarityTag = tags.FirstOrDefault(t => 
            t.Category?.Equals("Rarity", StringComparison.OrdinalIgnoreCase) == true ||
            t.LocalizedCategoryName?.Equals("Rarity", StringComparison.OrdinalIgnoreCase) == true);
        
        return rarityTag?.LocalizedTagName;
    }

    private string? ExtractWeapon(List<SteamTag> tags, string name)
    {
        var weaponTag = tags.FirstOrDefault(t => 
            t.Category?.Equals("Weapon", StringComparison.OrdinalIgnoreCase) == true ||
            t.LocalizedCategoryName?.Equals("Weapon", StringComparison.OrdinalIgnoreCase) == true);
        
        if (weaponTag != null)
            return weaponTag.LocalizedTagName;

        // Fallback: extract from name
        var weaponMatch = Regex.Match(name, @"^([A-Z0-9\-]+)", RegexOptions.IgnoreCase);
        if (weaponMatch.Success)
            return weaponMatch.Groups[1].Value;

        return null;
    }

    private string DetermineType(List<SteamTag> tags, string itemType, string name)
    {
        // Check tags first
        var typeTag = tags.FirstOrDefault(t => 
            t.Category?.Equals("Type", StringComparison.OrdinalIgnoreCase) == true ||
            t.LocalizedCategoryName?.Equals("Type", StringComparison.OrdinalIgnoreCase) == true);
        
        if (typeTag != null)
        {
            var typeName = typeTag.LocalizedTagName?.ToLowerInvariant() ?? "";
            if (typeName.Contains("glove")) return "Gloves";
            if (typeName.Contains("knife")) return "Knife";
            if (typeName.Contains("rifle")) return "Rifle";
            if (typeName.Contains("pistol")) return "Pistol";
            if (typeName.Contains("smg")) return "SMG";
            if (typeName.Contains("sniper")) return "Sniper Rifle";
            if (typeName.Contains("shotgun")) return "Shotgun";
            if (typeName.Contains("agent")) return "Agent";
            if (typeName.Contains("sticker")) return "Sticker";
        }

        // Check item type
        var lowerType = itemType?.ToLowerInvariant() ?? "";
        if (lowerType.Contains("glove")) return "Gloves";
        if (lowerType.Contains("knife")) return "Knife";
        if (lowerType.Contains("rifle")) return "Rifle";
        if (lowerType.Contains("pistol")) return "Pistol";

        // Check name
        var lowerName = name.ToLowerInvariant();
        if (lowerName.Contains("glove")) return "Gloves";
        if (lowerName.Contains("knife") || lowerName.Contains("karambit") || 
            lowerName.Contains("bayonet") || lowerName.Contains("butterfly")) return "Knife";

        return "Unknown";
    }

    private string? ExtractCollection(List<SteamTag> tags, List<SteamDescription> descriptions)
    {
        var collectionTag = tags.FirstOrDefault(t => 
            t.Category?.Equals("Collection", StringComparison.OrdinalIgnoreCase) == true ||
            t.LocalizedCategoryName?.Equals("Collection", StringComparison.OrdinalIgnoreCase) == true);
        
        if (collectionTag != null)
            return collectionTag.LocalizedTagName;

        // Try to extract from descriptions
        foreach (var desc in descriptions)
        {
            if (desc.Value?.Contains("Collection:", StringComparison.OrdinalIgnoreCase) == true)
            {
                var match = Regex.Match(desc.Value, @"Collection:\s*(.+)", RegexOptions.IgnoreCase);
                if (match.Success)
                    return match.Groups[1].Value.Trim();
            }
        }

        return null;
    }

    private int? ExtractPaintIndex(List<SteamDescription> descriptions)
    {
        foreach (var desc in descriptions)
        {
            if (desc.Value?.Contains("Paint Index:", StringComparison.OrdinalIgnoreCase) == true)
            {
                var match = Regex.Match(desc.Value, @"Paint Index:\s*(\d+)", RegexOptions.IgnoreCase);
                if (match.Success && int.TryParse(match.Groups[1].Value, out var index))
                    return index;
            }
        }
        return null;
    }

    private decimal GetDefaultPriceForRarity(string? rarity)
    {
        return rarity?.ToLowerInvariant() switch
        {
            "consumer grade" => 0.10m,
            "industrial grade" => 0.50m,
            "mil-spec" or "mil-spec grade" => 2.00m,
            "restricted" => 10.00m,
            "classified" => 50.00m,
            "covert" => 200.00m,
            "extraordinary" or "contraband" => 1000.00m,
            _ => 1.00m
        };
    }

    private class SteamItemData
    {
        public string MarketHashName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string Type { get; set; } = string.Empty;
        public List<SteamTag> Tags { get; set; } = new();
        public List<SteamDescription> Descriptions { get; set; } = new();
    }

    private class SteamInventoryResponse
    {
        public int Success { get; set; }
        public List<SteamItemDescription>? Descriptions { get; set; }
    }

    private class SteamItemDescription
    {
        public string? MarketHashName { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? IconUrl { get; set; }
        public string Type { get; set; } = string.Empty;
        public List<SteamTag>? Tags { get; set; }
        public List<SteamDescription>? Descriptions { get; set; }
    }

    private class SteamTag
    {
        public string? Category { get; set; }
        public string? LocalizedCategoryName { get; set; }
        public string? LocalizedTagName { get; set; }
    }

    private class SteamDescription
    {
        public string? Type { get; set; }
        public string? Value { get; set; }
        public string? Color { get; set; }
    }
}

