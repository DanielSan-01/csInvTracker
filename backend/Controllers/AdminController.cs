using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text;
using System.Globalization;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminController> _logger;

    public AdminController(ApplicationDbContext context, ILogger<AdminController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("skin-stats")]
    public async Task<ActionResult<SkinStats>> GetSkinStats()
    {
        var total = await _context.Skins.CountAsync();
        var byRarity = await _context.Skins
            .GroupBy(s => s.Rarity)
            .Select(g => new { Rarity = g.Key, Count = g.Count() })
            .ToListAsync();
        var byType = await _context.Skins
            .GroupBy(s => s.Type)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToListAsync();
        var byCollection = await _context.Skins
            .GroupBy(s => s.Collection)
            .Select(g => new { Collection = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .Take(10)
            .ToListAsync();

        return Ok(new SkinStats
        {
            TotalSkins = total,
            ByRarity = byRarity.ToDictionary(x => x.Rarity, x => x.Count),
            ByType = byType.ToDictionary(x => x.Type, x => x.Count),
            TopCollections = byCollection.ToDictionary(x => x.Collection ?? "Unknown", x => x.Count)
        });
    }

    [HttpDelete("clear-skins")]
    public async Task<ActionResult> ClearAllSkins()
    {
        try
        {
            // Only clear skins that don't have inventory items
            var skinsToDelete = await _context.Skins
                .Where(s => !s.InventoryItems.Any())
                .ToListAsync();

            _context.Skins.RemoveRange(skinsToDelete);
            await _context.SaveChangesAsync();

            return Ok(new { 
                Message = $"Deleted {skinsToDelete.Count} skins (kept skins with inventory items)",
                Deleted = skinsToDelete.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing skins");
            return StatusCode(500, new { Message = $"Failed to clear skins: {ex.Message}" });
        }
    }

    [HttpPost("import-from-bymykel")]
    public async Task<IActionResult> ImportFromByMykel()
    {
        try
        {
            _logger.LogInformation("🔍 Starting import from ByMykel CS:GO API...");
            
            using var httpClient = new HttpClient();
            var baseUrl = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en";
            var itemTypes = new[]
            {
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
            };
            
            int totalProcessed = 0;
            int totalCreated = 0;
            int totalUpdated = 0;
            
            foreach (var itemType in itemTypes)
            {
                _logger.LogInformation($"📦 Fetching {itemType}...");
                var response = await httpClient.GetAsync($"{baseUrl}/{itemType}.json");
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning($"⚠️ Failed to fetch {itemType}: {response.StatusCode}");
                    continue;
                }
                
                var jsonContent = await response.Content.ReadAsStringAsync();
                var items = JsonSerializer.Deserialize<List<JsonElement>>(jsonContent);
                
                if (items == null || items.Count == 0)
                {
                    _logger.LogWarning($"⚠️ No items found for {itemType}");
                    continue;
                }
                
                _logger.LogInformation($"✅ Fetched {items.Count} {itemType}");
                
                foreach (var item in items)
                {
                    totalProcessed++;
                    
                    try
                    {
                        // Extract values, handling nested objects
                        var skinName = item.GetProperty("name").GetString() ?? "Unknown";
                        var rarity = GetStringFromProperty(item, "rarity");
                        var collection = GetCollectionName(item);
                        var weapon = GetStringFromProperty(item, "weapon");
                        var imageUrl = item.TryGetProperty("image", out var img) ? img.GetString() : "";
                        var paintIndex = GetIntFromProperty(item, "paint_index");
                        
                        // Determine type
                        var type = DetermineTypeFromCategory(itemType, weapon);
                        
                        // Check if skin already exists
                        var existingSkin = await _context.Skins
                            .FirstOrDefaultAsync(s => s.Name == skinName);
                        
                        if (existingSkin != null)
                        {
                            existingSkin.Rarity = rarity;
                            existingSkin.Type = type;
                            existingSkin.Collection = collection;
                            existingSkin.Weapon = weapon;
                            existingSkin.ImageUrl = imageUrl ?? existingSkin.ImageUrl;
                            existingSkin.DefaultPrice = GetDefaultPriceForRarity(rarity);
                            existingSkin.PaintIndex = paintIndex ?? existingSkin.PaintIndex;
                            totalUpdated++;
                        }
                        else
                        {
                            var newSkin = new Skin
                            {
                                Name = skinName,
                                Rarity = rarity,
                                Type = type,
                                Collection = collection,
                                Weapon = weapon,
                                ImageUrl = imageUrl ?? "",
                                DefaultPrice = GetDefaultPriceForRarity(rarity),
                                PaintIndex = paintIndex
                            };
                            _context.Skins.Add(newSkin);
                            totalCreated++;
                        }
                        
                        if (totalProcessed % 100 == 0)
                        {
                            await _context.SaveChangesAsync();
                            _logger.LogInformation($"💾 Saved batch... Total: {totalProcessed} ({totalCreated} created, {totalUpdated} updated)");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"⚠️ Error processing item: {ex.Message}");
                    }
                }
            }
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"✅ Import complete! Processed: {totalProcessed}, Created: {totalCreated}, Updated: {totalUpdated}");
            
            return Ok(new
            {
                success = true,
                totalProcessed,
                created = totalCreated,
                updated = totalUpdated,
                message = "Successfully imported from ByMykel CS:GO API"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error importing from ByMykel API");
            return StatusCode(500, new { error = ex.Message });
        }
    }
    
    // Helper method to extract string from nested object or direct string
    private string GetStringFromProperty(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
            return "";
            
        if (prop.ValueKind == JsonValueKind.String)
            return prop.GetString() ?? "";
            
        if (prop.ValueKind == JsonValueKind.Object && prop.TryGetProperty("name", out var nameProp))
            return nameProp.GetString() ?? "";
            
        return "";
    }
    
    private string GetCollectionName(JsonElement element)
    {
        if (!element.TryGetProperty("collections", out var collections))
            return "";
            
        if (collections.ValueKind == JsonValueKind.Array && collections.GetArrayLength() > 0)
        {
            var firstCollection = collections[0];
            if (firstCollection.ValueKind == JsonValueKind.Object && firstCollection.TryGetProperty("name", out var name))
                return name.GetString() ?? "";
        }
        
        return "";
    }
    
    private string DetermineTypeFromCategory(string category, string weapon)
    {
        return category.ToLower() switch
        {
            "knives" => "Knife",
            "gloves" => "Gloves",
            "skins" when !string.IsNullOrEmpty(weapon) => weapon switch
            {
                string w when w.Contains("AK-47") || w.Contains("M4A4") || w.Contains("M4A1-S") || w.Contains("AWP") || w.Contains("Galil") || w.Contains("FAMAS") || w.Contains("AUG") || w.Contains("SG 553") => "Rifle",
                string w when w.Contains("Glock") || w.Contains("USP-S") || w.Contains("P2000") || w.Contains("P250") || w.Contains("Five-SeveN") || w.Contains("CZ75") || w.Contains("Tec-9") || w.Contains("Desert Eagle") || w.Contains("Dual Berettas") || w.Contains("R8") => "Pistol",
                string w when w.Contains("MAC-10") || w.Contains("MP9") || w.Contains("MP7") || w.Contains("MP5-SD") || w.Contains("UMP-45") || w.Contains("P90") || w.Contains("PP-Bizon") => "SMG",
                string w when w.Contains("Nova") || w.Contains("XM1014") || w.Contains("Sawed-Off") || w.Contains("MAG-7") => "Shotgun",
                string w when w.Contains("M249") || w.Contains("Negev") => "Machine Gun",
                string w when w.Contains("AWP") || w.Contains("SSG 08") || w.Contains("SCAR-20") || w.Contains("G3SG1") => "Sniper Rifle",
                _ => "Rifle"
            },
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
            _ => "Other"
        };
    }
    
    private int? GetIntFromProperty(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
            return null;
        
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

    [HttpPost("import-from-csfloat")]
    public async Task<ActionResult<ImportResult>> ImportFromCSFloat()
    {
        try
        {
            _logger.LogInformation("Starting CSFloat import...");
            
            // Fetch data from CSFloat
            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromMinutes(5);
            
            var response = await httpClient.GetStringAsync("https://csfloat.com/api/v1/items");
            var csfloatItems = JsonSerializer.Deserialize<List<CSFloatItemDto>>(response);
            
            if (csfloatItems == null || csfloatItems.Count == 0)
            {
                return BadRequest(new { Message = "No items received from CSFloat" });
            }

            var imported = 0;
            var updated = 0;
            var skipped = 0;

            foreach (var item in csfloatItems)
            {
                try
                {
                    // Skip items without proper names
                    if (string.IsNullOrWhiteSpace(item.Name))
                    {
                        skipped++;
                        continue;
                    }

                    var existingSkin = await _context.Skins
                        .FirstOrDefaultAsync(s => s.Name == item.Name);

                    if (existingSkin != null)
                    {
                        // Update existing skin with CSFloat data
                        existingSkin.Rarity = item.Rarity ?? existingSkin.Rarity;
                        existingSkin.Type = item.Category ?? existingSkin.Type;
                        existingSkin.Collection = item.Collection;
                        existingSkin.Weapon = item.Weapon;
                        existingSkin.ImageUrl = item.ImageUrl ?? existingSkin.ImageUrl;
                        
                        updated++;
                    }
                    else
                    {
                        // Create new skin
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
                        
                        _context.Skins.Add(newSkin);
                        imported++;
                    }

                    // Save in batches of 100
                    if ((imported + updated) % 100 == 0)
                    {
                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"Progress: {imported} imported, {updated} updated");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Error processing item: {item.Name}");
                    skipped++;
                }
            }

            // Final save
            await _context.SaveChangesAsync();

            var result = new ImportResult
            {
                Success = true,
                TotalProcessed = csfloatItems.Count,
                Imported = imported,
                Updated = updated,
                Skipped = skipped,
                Message = $"CSFloat import complete: {imported} new, {updated} updated, {skipped} skipped"
            };

            _logger.LogInformation(result.Message);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing from CSFloat");
            return StatusCode(500, new { Message = $"Failed to import from CSFloat: {ex.Message}" });
        }
    }

    private static string DetermineType(string name)
    {
        if (name.Contains("Knife") || name.Contains("Karambit") || name.Contains("Bayonet") || 
            name.Contains("Butterfly") || name.Contains("Flip") || name.Contains("Gut") ||
            name.Contains("Huntsman") || name.Contains("Falchion") || name.Contains("Bowie") ||
            name.Contains("Shadow Daggers") || name.Contains("Paracord") || name.Contains("Survival") ||
            name.Contains("Ursus") || name.Contains("Navaja") || name.Contains("Stiletto") ||
            name.Contains("Talon") || name.Contains("Classic") || name.Contains("Nomad") ||
            name.Contains("Skeleton"))
            return "Knife";
        
        if (name.Contains("Gloves") || name.Contains("Hand Wraps") || name.Contains("Driver Gloves") ||
            name.Contains("Moto Gloves") || name.Contains("Specialist Gloves") || name.Contains("Sport Gloves") ||
            name.Contains("Bloodhound Gloves") || name.Contains("Hydra Gloves") || name.Contains("Broken Fang"))
            return "Gloves";
        
        if (name.Contains("Sticker"))
            return "Sticker";
        
        if (name.Contains("Case") || name.Contains("Capsule") || name.Contains("Package"))
            return "Case";
        
        if (name.Contains("Pin") || name.Contains("Collectible"))
            return "Collectible";
        
        if (name.Contains("Music Kit"))
            return "Music Kit";
        
        if (name.Contains("Patch"))
            return "Patch";
        
        if (name.Contains("Agent"))
            return "Agent";

        // Default weapon types
        if (name.Contains("AK-47") || name.Contains("M4A4") || name.Contains("M4A1-S") || 
            name.Contains("FAMAS") || name.Contains("Galil") || name.Contains("AUG") || name.Contains("SG 553"))
            return "Rifle";
        
        if (name.Contains("AWP") || name.Contains("SSG 08") || name.Contains("G3SG1") || name.Contains("SCAR-20"))
            return "Sniper Rifle";
        
        if (name.Contains("Glock") || name.Contains("USP-S") || name.Contains("P2000") || 
            name.Contains("Desert Eagle") || name.Contains("Five-SeveN") || name.Contains("Tec-9") ||
            name.Contains("CZ75") || name.Contains("Dual Berettas") || name.Contains("P250") || name.Contains("R8"))
            return "Pistol";
        
        if (name.Contains("MP9") || name.Contains("MAC-10") || name.Contains("MP7") || 
            name.Contains("UMP-45") || name.Contains("P90") || name.Contains("PP-Bizon") || name.Contains("MP5-SD"))
            return "SMG";
        
        if (name.Contains("Nova") || name.Contains("XM1014") || name.Contains("MAG-7") || name.Contains("Sawed-Off"))
            return "Shotgun";
        
        if (name.Contains("M249") || name.Contains("Negev"))
            return "Machine Gun";

        return "Other";
    }

    private static string? ExtractWeapon(string name)
    {
        // Extract weapon name from format like "AK-47 | Redline"
        var parts = name.Split('|');
        if (parts.Length > 0)
        {
            return parts[0].Trim();
        }
        return null;
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

    // POST: api/admin/bulk-import-inventory
    [HttpPost("bulk-import-inventory")]
    public async Task<ActionResult<BulkImportInventoryResult>> BulkImportInventory([FromBody] BulkImportInventoryRequest request)
    {
        try
        {
            // Verify user exists
            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null)
            {
                return BadRequest($"User with ID {request.UserId} not found");
            }

            var results = new BulkImportInventoryResult
            {
                UserId = request.UserId,
                TotalRequested = request.Items.Count,
                SuccessCount = 0,
                FailedCount = 0,
                Errors = new List<string>()
            };

            // Get all skins for matching
            var allSkins = await _context.Skins.ToListAsync();

            foreach (var item in request.Items)
            {
                try
                {
                    // Find matching skin by name (case-insensitive, flexible matching)
                    var skin = FindMatchingSkin(allSkins, item.SkinName);
                    
                    if (skin == null)
                    {
                        results.FailedCount++;
                        results.Errors.Add($"Skin not found: {item.SkinName}");
                        continue;
                    }

                    // Create inventory item
                    var inventoryItem = new InventoryItem
                    {
                        UserId = request.UserId,
                        SkinId = skin.Id,
                        Float = item.Float,
                        Exterior = GetExteriorFromFloat(item.Float),
                        PaintSeed = item.PaintSeed,
                        Price = item.Price,
                        Cost = item.Cost,
                        TradeProtected = item.TradeProtected ?? false,
                        TradableAfter = (item.TradeProtected ?? false) ? DateTime.UtcNow.AddDays(7) : null,
                        AcquiredAt = DateTime.UtcNow
                    };

                    _context.InventoryItems.Add(inventoryItem);
                    results.SuccessCount++;
                }
                catch (Exception ex)
                {
                    results.FailedCount++;
                    results.Errors.Add($"Error processing {item.SkinName}: {ex.Message}");
                    _logger.LogError(ex, "Error processing inventory item {SkinName}", item.SkinName);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk importing inventory");
            return StatusCode(500, new { error = "An error occurred while bulk importing inventory", message = ex.Message });
        }
    }

    private static Skin? FindMatchingSkin(List<Skin> skins, string searchName)
    {
        // Normalize search name
        var normalizedSearch = NormalizeSkinName(searchName);
        
        // Try exact match first
        var exactMatch = skins.FirstOrDefault(s => 
            NormalizeSkinName(s.Name).Equals(normalizedSearch, StringComparison.OrdinalIgnoreCase));
        if (exactMatch != null) return exactMatch;

        // Try contains match
        var containsMatch = skins.FirstOrDefault(s => 
            NormalizeSkinName(s.Name).Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase) ||
            normalizedSearch.Contains(NormalizeSkinName(s.Name), StringComparison.OrdinalIgnoreCase));
        if (containsMatch != null) return containsMatch;

        // Try partial word matching
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
        // Remove special characters, normalize spaces
        return name
            .Replace("★", "")
            .Replace("|", "")
            .Replace("StatTrak™", "StatTrak")
            .Replace("StatTrak", "")
            .Trim()
            .Replace("  ", " ");
    }

    private static int CalculateMatchScore(string skinName, string searchName, string[] searchWords)
    {
        var score = 0;
        var normalizedSkin = NormalizeSkinName(skinName).ToLower();
        
        foreach (var word in searchWords)
        {
            if (normalizedSkin.Contains(word.ToLower()))
                score += 10;
        }
        
        // Bonus for longer matches
        if (normalizedSkin.Contains(searchName.ToLower()))
            score += 50;
            
        return score;
    }

    private static string GetExteriorFromFloat(double floatValue)
    {
        return floatValue switch
        {
            >= 0 and <= 0.07 => "Factory New",
            > 0.07 and <= 0.15 => "Minimal Wear",
            > 0.15 and <= 0.38 => "Field-Tested",
            > 0.38 and <= 0.45 => "Well-Worn",
            > 0.45 and <= 1.0 => "Battle-Scarred",
            _ => "Field-Tested"
        };
    }

    // POST: api/admin/import-inventory-csv
    [HttpPost("import-inventory-csv")]
    public async Task<ActionResult<BulkImportInventoryResult>> ImportInventoryFromCsv(
        [FromForm] int userId,
        [FromForm] IFormFile file)
    {
        try
        {
            // Verify user exists
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return BadRequest($"User with ID {userId} not found");
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded");
            }

            var results = new BulkImportInventoryResult
            {
                UserId = userId,
                TotalRequested = 0,
                SuccessCount = 0,
                FailedCount = 0,
                Errors = new List<string>()
            };

            // Read CSV file
            using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
            var csvContent = await reader.ReadToEndAsync();
            var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);

            // Get all skins for matching
            var allSkins = await _context.Skins.ToListAsync();

            // Parse CSV lines (skip header if present)
            int lineNumber = 0;
            foreach (var line in lines)
            {
                lineNumber++;
                var trimmedLine = line.Trim();
                
                // Skip empty lines, headers, or category separators
                if (string.IsNullOrWhiteSpace(trimmedLine) || 
                    trimmedLine.StartsWith("Golds") ||
                    trimmedLine.StartsWith("Gloves") ||
                    trimmedLine.StartsWith("Knifes") ||
                    trimmedLine.StartsWith("Agents") ||
                    trimmedLine.StartsWith("Coverts") ||
                    trimmedLine.StartsWith("Weapons") ||
                    trimmedLine.All(c => c == '\t' || c == ' ' || char.IsDigit(c) || c == '-' || c == '.'))
                {
                    continue;
                }

                try
                {
                    // Parse CSV line: Name, Float, Price, Cost, Profit, Profit%
                    // Split by tab or comma
                    var parts = trimmedLine.Split(new[] { '\t', ',' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(p => p.Trim())
                        .Where(p => !string.IsNullOrWhiteSpace(p))
                        .ToArray();

                    if (parts.Length < 3)
                    {
                        results.FailedCount++;
                        results.Errors.Add($"Line {lineNumber}: Not enough columns (need at least Name, Price, Cost)");
                        continue;
                    }

                    // Extract data
                    var skinName = parts[0];
                    
                    // Try to parse float (might be in column 1 or 2)
                    double floatValue = 0.0;
                    int priceIndex = 1;
                    int costIndex = 2;

                    // Check if second column is a float
                    if (parts.Length > 1 && double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedFloat))
                    {
                        floatValue = parsedFloat;
                        priceIndex = 2;
                        costIndex = 3;
                    }

                    // Parse price and cost
                    if (parts.Length <= priceIndex || !decimal.TryParse(parts[priceIndex], NumberStyles.Currency | NumberStyles.Float, CultureInfo.InvariantCulture, out var price))
                    {
                        results.FailedCount++;
                        results.Errors.Add($"Line {lineNumber}: Invalid price for '{skinName}'");
                        continue;
                    }

                    decimal? cost = null;
                    if (parts.Length > costIndex && decimal.TryParse(parts[costIndex], NumberStyles.Currency | NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedCost))
                    {
                        cost = parsedCost;
                    }

                    // Find matching skin
                    var skin = FindMatchingSkin(allSkins, skinName);
                    if (skin == null)
                    {
                        results.FailedCount++;
                        results.Errors.Add($"Line {lineNumber}: Skin not found: '{skinName}'");
                        continue;
                    }

                    // Create inventory item
                    var inventoryItem = new InventoryItem
                    {
                        UserId = userId,
                        SkinId = skin.Id,
                        Float = floatValue,
                        Exterior = GetExteriorFromFloat(floatValue),
                        Price = price,
                        Cost = cost,
                        TradeProtected = false,
                        AcquiredAt = DateTime.UtcNow
                    };

                    _context.InventoryItems.Add(inventoryItem);
                    results.SuccessCount++;
                    results.TotalRequested++;
                }
                catch (Exception ex)
                {
                    results.FailedCount++;
                    results.Errors.Add($"Line {lineNumber}: Error processing line - {ex.Message}");
                    _logger.LogError(ex, "Error processing CSV line {LineNumber}", lineNumber);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing inventory from CSV");
            return StatusCode(500, new { error = "An error occurred while importing inventory from CSV", message = ex.Message });
        }
    }
}

public class ImportResult
{
    public bool Success { get; set; }
    public int TotalProcessed { get; set; }
    public int Imported { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class SkinStats
{
    public int TotalSkins { get; set; }
    public Dictionary<string, int> ByRarity { get; set; } = new();
    public Dictionary<string, int> ByType { get; set; } = new();
    public Dictionary<string, int> TopCollections { get; set; } = new();
}

public class CSFloatItemDto
{
    [System.Text.Json.Serialization.JsonPropertyName("market_hash_name")]
    public string? MarketHashName { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("name")]
    public string? Name { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("rarity")]
    public string? Rarity { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("category")]
    public string? Category { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("weapon")]
    public string? Weapon { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("collection")]
    public string? Collection { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("image")]
    public string? ImageUrl { get; set; }
}

public class BulkImportInventoryRequest
{
    public int UserId { get; set; }
    public List<BulkImportInventoryItem> Items { get; set; } = new();
}

public class BulkImportInventoryItem
{
    public string SkinName { get; set; } = string.Empty;
    public double Float { get; set; }
    public decimal Price { get; set; }
    public decimal? Cost { get; set; }
    public int? PaintSeed { get; set; }
    public bool? TradeProtected { get; set; }
}

public class BulkImportInventoryResult
{
    public int UserId { get; set; }
    public int TotalRequested { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

