using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Globalization;
using backend.Data;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminController> _logger;
    private readonly SkinImportService _skinImportService;

    public AdminController(ApplicationDbContext context, SkinImportService skinImportService, ILogger<AdminController> logger)
    {
        _context = context;
        _skinImportService = skinImportService;
        _logger = logger;
    }

    // GET: api/admin/users
    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetAllUsers()
    {
        try
        {
            var users = await _context.Users
                .Include(u => u.InventoryItems)
                .ThenInclude(i => i.Skin)
                .Select(u => new AdminUserDto
                {
                    Id = u.Id,
                    SteamId = u.SteamId,
                    Username = u.Username,
                    CreatedAt = u.CreatedAt,
                    LastLoginAt = u.LastLoginAt,
                    ItemCount = u.InventoryItems.Count,
                    TotalValue = u.InventoryItems
                        .Select(i => i.Price)
                        .DefaultIfEmpty(0m)
                        .Sum(),
                    TotalCost = u.InventoryItems
                        .Select(i => i.Cost ?? 0m)
                        .DefaultIfEmpty(0m)
                        .Sum()
                })
                .OrderByDescending(u => u.LastLoginAt)
                .ToListAsync();

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching users");
            return StatusCode(500, new { error = "An error occurred while fetching users" });
        }
    }

    // GET: api/admin/stats
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStats>> GetSystemStats()
    {
        try
        {
            var totalUsers = await _context.Users.CountAsync();
            var totalSkins = await _context.Skins.CountAsync();
            var totalItems = await _context.InventoryItems.CountAsync();
            var totalValue = await _context.InventoryItems
                .Select(i => (decimal?)i.Price)
                .SumAsync() ?? 0m;
            
            var recentActivity = await _context.InventoryItems
                .OrderByDescending(i => i.AcquiredAt)
                .Take(10)
                .Include(i => i.Skin)
                .Include(i => i.User)
                .Select(i => new RecentActivityDto
                {
                    UserName = i.User.Username ?? i.User.SteamId,
                    SkinName = i.Skin.Name,
                    Action = "Added",
                    Timestamp = i.AcquiredAt
                })
                .ToListAsync();

            return Ok(new AdminStats
            {
                TotalUsers = totalUsers,
                TotalSkins = totalSkins,
                TotalInventoryItems = totalItems,
                TotalInventoryValue = totalValue,
                RecentActivity = recentActivity
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching system stats");
            return StatusCode(500, new { error = "An error occurred while fetching system stats" });
        }
    }

    // POST: api/admin/skins
    [HttpPost("skins")]
    public async Task<ActionResult<Skin>> CreateSkin([FromBody] CreateSkinDto dto)
    {
        try
        {
            // Check if skin already exists
            var existingSkin = await _context.Skins
                .FirstOrDefaultAsync(s => s.Name == dto.Name);

            if (existingSkin != null)
            {
                return BadRequest(new { error = "A skin with this name already exists" });
            }

            var newSkin = new Skin
            {
                Name = dto.Name,
                Rarity = dto.Rarity,
                Type = dto.Type,
                Collection = dto.Collection,
                Weapon = dto.Weapon,
                ImageUrl = dto.ImageUrl ?? "",
                DefaultPrice = dto.DefaultPrice,
                PaintIndex = dto.PaintIndex
            };

            _context.Skins.Add(newSkin);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Created new skin: {newSkin.Name} (ID: {newSkin.Id})");
            return CreatedAtAction(nameof(CreateSkin), new { id = newSkin.Id }, newSkin);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating skin");
            return StatusCode(500, new { error = "An error occurred while creating the skin" });
        }
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
    public async Task<IActionResult> ImportFromByMykel(CancellationToken cancellationToken)
    {
        var result = await _skinImportService.ImportFromByMykelAsync(cancellationToken);

        return Ok(new
        {
            result.Success,
            result.TotalProcessed,
            Created = result.Created,
            Updated = result.Updated,
            result.Message
        });
    }

    [HttpPost("import-from-csfloat")]
    public async Task<ActionResult<CsFloatImportResult>> ImportFromCSFloat(CancellationToken cancellationToken)
    {
        var result = await _skinImportService.ImportFromCsFloatAsync(cancellationToken);

        if (!result.Success)
        {
            return StatusCode(500, new { result.Message });
        }

        return Ok(result);
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

public class SkinStats
{
    public int TotalSkins { get; set; }
    public Dictionary<string, int> ByRarity { get; set; } = new();
    public Dictionary<string, int> ByType { get; set; } = new();
    public Dictionary<string, int> TopCollections { get; set; } = new();
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

public class AdminUserDto
{
    public int Id { get; set; }
    public string SteamId { get; set; } = string.Empty;
    public string? Username { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastLoginAt { get; set; }
    public int ItemCount { get; set; }
    public decimal TotalValue { get; set; }
    public decimal TotalCost { get; set; }
}

public class AdminStats
{
    public int TotalUsers { get; set; }
    public int TotalSkins { get; set; }
    public int TotalInventoryItems { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public List<RecentActivityDto> RecentActivity { get; set; } = new();
}

public class RecentActivityDto
{
    public string UserName { get; set; } = string.Empty;
    public string SkinName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class CreateSkinDto
{
    public string Name { get; set; } = string.Empty;
    public string Rarity { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Collection { get; set; }
    public string? Weapon { get; set; }
    public string? ImageUrl { get; set; }
    public decimal? DefaultPrice { get; set; }
    public int? PaintIndex { get; set; }
}

