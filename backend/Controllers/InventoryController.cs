using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Text.Json;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InventoryController> _logger;
    private readonly DopplerPhaseService _dopplerPhaseService;
    private readonly SteamInventoryImportService _steamImportService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SteamApiService _steamApiService;

    public InventoryController(
        ApplicationDbContext context,
        DopplerPhaseService dopplerPhaseService,
        ILogger<InventoryController> logger,
        SteamInventoryImportService steamImportService,
        IHttpClientFactory httpClientFactory,
        SteamApiService steamApiService)
    {
        _context = context;
        _dopplerPhaseService = dopplerPhaseService;
        _logger = logger;
        _steamImportService = steamImportService;
        _httpClientFactory = httpClientFactory;
        _steamApiService = steamApiService;
    }

    // Helper method to determine exterior from float
    private string GetExteriorFromFloat(double floatValue)
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

    /// <summary>
    /// Calculates tradableAfter date using Valve time
    /// Valve counts days from 9am GMT+1 (which is 8am UTC)
    /// </summary>
    private DateTime CalculateValveTradeLockDate(int days)
    {
        var now = DateTime.UtcNow;
        
        // Find the next 8am UTC (9am GMT+1)
        var nextValveDay = new DateTime(now.Year, now.Month, now.Day, 8, 0, 0, DateTimeKind.Utc);
        
        // If we've already passed 8am UTC today, move to tomorrow
        if (now.Hour > 8 || (now.Hour == 8 && now.Minute > 0))
        {
            nextValveDay = nextValveDay.AddDays(1);
        }
        
        // Add the specified number of days
        return nextValveDay.AddDays(days);
    }

    /// <summary>
    /// Validates SteamID64 format: Must be a 17-digit number starting with 7656119...
    /// </summary>
    private bool IsValidSteamId64(string steamId)
    {
        if (string.IsNullOrWhiteSpace(steamId))
            return false;

        // Must be exactly 17 digits
        if (steamId.Length != 17)
            return false;

        // Must be all digits
        if (!steamId.All(char.IsDigit))
            return false;

        // Must start with 7656119 (SteamID64 format)
        if (!steamId.StartsWith("7656119"))
            return false;

        return true;
    }

    // GET: api/inventory/value-history?userId={userId}
    [HttpGet("value-history")]
    public async Task<ActionResult<IEnumerable<InventoryValueHistoryDto>>> GetInventoryValueHistory([FromQuery] int? userId)
    {
        try
        {
            if (!userId.HasValue)
            {
                return BadRequest(new { error = "User ID is required" });
            }

            // Get user to find account creation date
            var user = await _context.Users.FindAsync(userId.Value);
            if (user == null)
            {
                return NotFound(new { error = "User not found" });
            }

            // Get all items for this user, ordered by acquisition date
            var items = await _context.InventoryItems
                .Where(i => i.UserId == userId.Value)
                .OrderBy(i => i.AcquiredAt)
                .Select(i => new { i.AcquiredAt, i.Price })
                .ToListAsync();

            if (items.Count == 0)
            {
                return Ok(new List<InventoryValueHistoryDto>());
            }

            var startDate = user.CreatedAt.Date;
            var endDate = DateTime.UtcNow.Date;
            var history = new List<InventoryValueHistoryDto>();

            // Calculate cumulative value over time
            decimal cumulativeValue = 0;
            int itemIndex = 0;

            // Generate data points for each day from account creation to today
            // For performance, we'll group by week if the account is older than 3 months
            var daysDiff = (endDate - startDate).Days;
            var useWeeklyIntervals = daysDiff > 90;

            var currentDate = startDate;
            while (currentDate <= endDate)
            {
                // Add all items acquired up to this date
                while (itemIndex < items.Count && items[itemIndex].AcquiredAt.Date <= currentDate)
                {
                    cumulativeValue += items[itemIndex].Price;
                    itemIndex++;
                }

                history.Add(new InventoryValueHistoryDto
                {
                    Date = currentDate,
                    TotalValue = cumulativeValue
                });

                // Move to next interval
                if (useWeeklyIntervals)
                {
                    currentDate = currentDate.AddDays(7);
                    // Ensure we don't skip the last date
                    if (currentDate > endDate && currentDate.AddDays(-7) < endDate)
                    {
                        currentDate = endDate;
                    }
                }
                else
                {
                    currentDate = currentDate.AddDays(1);
                }
            }

            // Always include today's value
            if (history.LastOrDefault()?.Date != endDate)
            {
                // Add all remaining items
                while (itemIndex < items.Count)
                {
                    cumulativeValue += items[itemIndex].Price;
                    itemIndex++;
                }

                history.Add(new InventoryValueHistoryDto
                {
                    Date = endDate,
                    TotalValue = cumulativeValue
                });
            }

            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory value history for user {UserId}", userId);
            return StatusCode(500, "An error occurred while fetching inventory value history");
        }
    }

    // GET: api/inventory/stats?userId={userId}
    [HttpGet("stats")]
    public async Task<ActionResult<InventoryStatsDto>> GetInventoryStats([FromQuery] int? userId)
    {
        try
        {
            var query = _context.InventoryItems.AsQueryable();

            if (userId.HasValue)
            {
                query = query.Where(i => i.UserId == userId.Value);
            }

            var aggregate = await query
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalItems = g.Count(),
                    MarketValue = g.Sum(i => i.Price),
                    AcquisitionCost = g.Sum(i => i.Cost ?? 0m)
                })
                .FirstOrDefaultAsync();

            if (aggregate == null)
            {
                return Ok(new InventoryStatsDto
                {
                    TotalItems = 0,
                    MarketValue = 0m,
                    AcquisitionCost = 0m,
                    NetProfit = 0m,
                    AverageProfitPercent = null
                });
            }

            var profit = aggregate.MarketValue - aggregate.AcquisitionCost;
            decimal? avgProfitPercent = aggregate.AcquisitionCost > 0
                ? (profit / aggregate.AcquisitionCost) * 100m
                : null;

            return Ok(new InventoryStatsDto
            {
                TotalItems = aggregate.TotalItems,
                MarketValue = decimal.Round(aggregate.MarketValue, 2),
                AcquisitionCost = decimal.Round(aggregate.AcquisitionCost, 2),
                NetProfit = decimal.Round(profit, 2),
                AverageProfitPercent = avgProfitPercent.HasValue ? decimal.Round(avgProfitPercent.Value, 2) : null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory stats for user {UserId}", userId);
            return StatusCode(500, "An error occurred while fetching inventory stats");
        }
    }

    // GET: api/inventory?userId={userId}
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetInventory([FromQuery] int? userId)
    {
        try
        {
            _logger.LogInformation("Fetching inventory for userId: {UserId}", userId);
            
            // Test database connection first
            try
            {
                await _context.Database.CanConnectAsync();
            }
            catch (Exception dbEx)
            {
                _logger.LogError(dbEx, "Database connection failed. Error: {Error}", dbEx.Message);
                return StatusCode(500, new { 
                    error = "Database connection failed", 
                    details = "The application cannot connect to the database. Please check DATABASE_URL environment variable in Railway.",
                    connectionError = dbEx.Message,
                    innerException = dbEx.InnerException?.Message
                });
            }
            
            // Query inventory items - handle potential missing MarketHashName column gracefully
            var query = _context.InventoryItems
                .Include(i => i.Skin)
                .Include(i => i.Stickers)
                .AsQueryable();

            // Filter by user if userId provided
            if (userId.HasValue)
            {
                query = query.Where(i => i.UserId == userId.Value);
            }
            
            var items = await query.ToListAsync();
            _logger.LogInformation("Found {Count} inventory items", items.Count);
            
            var dtoItems = new List<InventoryItemDto>();
            foreach (var item in items)
            {
                try
                {
                    var dto = MapToDto(item);
                    dtoItems.Add(dto);
                }
                catch (Exception itemEx)
                {
                    _logger.LogError(itemEx, "Error mapping inventory item {ItemId} to DTO. Skipping item.", item.Id);
                    // Continue processing other items instead of failing completely
                }
            }

            _logger.LogInformation("Successfully mapped {Count} items to DTOs", dtoItems.Count);
            return Ok(dtoItems);
        }
        catch (Npgsql.PostgresException pgEx) when (pgEx.SqlState == "42703")
        {
            // Column does not exist error
            _logger.LogError(pgEx, "Database schema error: Column does not exist. SqlState: {SqlState}, Message: {Message}", pgEx.SqlState, pgEx.MessageText);
            return StatusCode(500, new { 
                error = "Database schema mismatch", 
                details = $"Database column missing: {pgEx.MessageText}. The migration may not have been applied yet. Please check Railway logs for migration status.",
                sqlState = pgEx.SqlState,
                hint = pgEx.Hint
            });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "Database error while fetching inventory for userId: {UserId}", userId);
            return StatusCode(500, new { 
                error = "Database error", 
                details = "An error occurred while querying the database. Please check database connection and configuration.",
                dbError = dbEx.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory for userId: {UserId}. Exception: {Exception}", userId, ex);
            return StatusCode(500, new { error = "An error occurred while fetching inventory", details = ex.Message });
        }
    }

    // GET: api/inventory/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<InventoryItemDto>> GetInventoryItem(int id)
    {
        try
        {
            var item = await _context.InventoryItems
                .Include(i => i.Skin)
                .Include(i => i.Stickers)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
            {
                return NotFound();
            }

            return Ok(MapToDto(item));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory item {ItemId}", id);
            return StatusCode(500, "An error occurred while fetching the item");
        }
    }

    // POST: api/inventory
    [HttpPost]
    public async Task<ActionResult<InventoryItemDto>> CreateInventoryItem(CreateInventoryItemDto dto)
    {
        try
        {
            // Verify user exists
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null)
            {
                return BadRequest("Invalid user ID");
            }
            
            // Verify skin exists
            var skin = await _context.Skins.FindAsync(dto.SkinId);
            if (skin == null)
            {
                return BadRequest("Invalid skin ID");
            }

            var item = new InventoryItem
            {
                UserId = dto.UserId,
                SkinId = dto.SkinId,
                Float = dto.Float,
                Exterior = GetExteriorFromFloat(dto.Float),
                PaintSeed = dto.PaintSeed,
                Price = dto.Price,
                Cost = dto.Cost,
                ImageUrl = dto.ImageUrl,
                TradeProtected = dto.TradeProtected,
                TradableAfter = dto.TradableAfter ?? (dto.TradeProtected ? CalculateValveTradeLockDate(7) : null),
                AcquiredAt = DateTime.UtcNow
            };

            // Add stickers if provided
            if (dto.Stickers != null && dto.Stickers.Any())
            {
                foreach (var stickerDto in dto.Stickers)
                {
                    item.Stickers.Add(new Sticker
                    {
                        Name = stickerDto.Name,
                        Price = stickerDto.Price,
                        Slot = stickerDto.Slot,
                        ImageUrl = stickerDto.ImageUrl
                    });
                }
            }

            _context.InventoryItems.Add(item);
            await _context.SaveChangesAsync();

            // Fetch the complete item with skin data
            var createdItem = await _context.InventoryItems
                .Include(i => i.Skin)
                .Include(i => i.Stickers)
                .FirstAsync(i => i.Id == item.Id);

            return CreatedAtAction(nameof(GetInventoryItem), new { id = item.Id }, MapToDto(createdItem));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating inventory item");
            return StatusCode(500, "An error occurred while creating the item");
        }
    }

    // PUT: api/inventory/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<InventoryItemDto>> UpdateInventoryItem(int id, UpdateInventoryItemDto dto)
    {
        try
        {
            var item = await _context.InventoryItems
                .Include(i => i.Stickers)
                .FirstOrDefaultAsync(i => i.Id == id);
            if (item == null)
            {
                return NotFound();
            }

            item.Float = dto.Float;
            item.Exterior = GetExteriorFromFloat(dto.Float);
            item.PaintSeed = dto.PaintSeed;
            item.Price = dto.Price;
            item.Cost = dto.Cost;
            item.ImageUrl = dto.ImageUrl;
            
            // Handle trade protection changes
            item.TradeProtected = dto.TradeProtected;
            if (dto.TradeProtected)
            {
                // Use provided TradableAfter or default to 7 days using Valve time
                item.TradableAfter = dto.TradableAfter ?? CalculateValveTradeLockDate(7);
            }
            else
            {
                // Protection removed
                item.TradableAfter = null;
            }

            // Update stickers - remove existing and add new ones
            item.Stickers.Clear();

            if (dto.Stickers != null && dto.Stickers.Any())
            {
                _logger.LogInformation("Adding {Count} stickers to item {ItemId}", dto.Stickers.Count, id);
                foreach (var stickerDto in dto.Stickers)
                {
                    var sticker = new Sticker
                    {
                        Name = stickerDto.Name,
                        Price = stickerDto.Price,
                        Slot = stickerDto.Slot,
                        ImageUrl = stickerDto.ImageUrl
                    };
                    item.Stickers.Add(sticker);
                    _logger.LogInformation("Added sticker: {Name} (Price: {Price}, Slot: {Slot})", sticker.Name, sticker.Price, sticker.Slot);
                }
            }
            else
            {
                _logger.LogInformation("No stickers to add for item {ItemId}", id);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Saved changes for item {ItemId}, sticker count: {Count}", id, item.Stickers.Count);

            // Fetch the updated item with skin data
            var updatedItem = await _context.InventoryItems
                .Include(i => i.Skin)
                .Include(i => i.Stickers)
                .FirstAsync(i => i.Id == id);

            _logger.LogInformation("Fetched updated item {ItemId} with {StickerCount} stickers", id, updatedItem.Stickers.Count);
            var resultDto = MapToDto(updatedItem);
            _logger.LogInformation("Mapped to DTO with {StickerCount} stickers", resultDto.Stickers?.Count ?? 0);
            
            return Ok(resultDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating inventory item {ItemId}", id);
            return StatusCode(500, "An error occurred while updating the item");
        }
    }

    // DELETE: api/inventory/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteInventoryItem(int id)
    {
        try
        {
            var item = await _context.InventoryItems.FindAsync(id);
            if (item == null)
            {
                return NotFound();
            }

            _context.InventoryItems.Remove(item);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting inventory item {ItemId}", id);
            return StatusCode(500, "An error occurred while deleting the item");
        }
    }

    private InventoryItemDto MapToDto(InventoryItem item)
    {
        if (item == null)
        {
            throw new ArgumentNullException(nameof(item));
        }

        // Handle null Skin gracefully (in case skin was deleted)
        if (item.Skin == null)
        {
            _logger.LogWarning("Inventory item {ItemId} has null Skin (SkinId: {SkinId}). Skipping or using defaults.", 
                item.Id, item.SkinId);
            
            return new InventoryItemDto
            {
                Id = item.Id,
                SkinId = item.SkinId,
                SkinName = "Unknown Skin",
                Rarity = "Unknown",
                Type = "Unknown",
                Collection = null,
                Weapon = null,
                Float = item.Float,
                Exterior = item.Exterior,
                PaintSeed = item.PaintSeed,
                Price = item.Price,
                Cost = item.Cost,
                ImageUrl = item.ImageUrl,
                TradeProtected = item.TradeProtected,
                TradableAfter = item.TradableAfter,
                AcquiredAt = item.AcquiredAt,
                PaintIndex = null,
                Stickers = item.Stickers?.Select(s => new StickerDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Price = s.Price,
                    Slot = s.Slot,
                    ImageUrl = s.ImageUrl
                }).ToList() ?? new List<StickerDto>()
            };
        }
        
        var dto = new InventoryItemDto
        {
            Id = item.Id,
            SkinId = item.SkinId,
            SkinName = item.Skin.Name ?? "Unknown",
            Rarity = item.Skin.Rarity ?? "Unknown",
            Type = item.Skin.Type ?? "Unknown",
            Collection = item.Skin.Collection,
            Weapon = item.Skin.Weapon,
            Float = item.Float,
            Exterior = item.Exterior,
            PaintSeed = item.PaintSeed,
            Price = item.Price,
            Cost = item.Cost,
            ImageUrl = item.ImageUrl ?? item.Skin.ImageUrl,
            TradeProtected = item.TradeProtected,
            TradableAfter = item.TradableAfter,
            AcquiredAt = item.AcquiredAt,
            PaintIndex = item.Skin.PaintIndex
        };

        // Safely get Doppler phase info
        try
        {
            if (_dopplerPhaseService != null)
            {
                var phaseInfo = _dopplerPhaseService.GetPhaseInfo(item.Skin.PaintIndex);
                if (phaseInfo != null)
                {
                    dto.DopplerPhase = phaseInfo.Phase;
                    dto.DopplerPhaseImageUrl = phaseInfo.ImageUrl;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting Doppler phase info for inventory item {ItemId} (PaintIndex: {PaintIndex})", 
                item.Id, item.Skin.PaintIndex);
            // Continue without phase info rather than failing completely
        }

        // Map stickers
        try
        {
            dto.Stickers = item.Stickers?.Select(s => new StickerDto
            {
                Id = s.Id,
                Name = s.Name ?? string.Empty,
                Price = s.Price,
                Slot = s.Slot,
                ImageUrl = s.ImageUrl
            }).ToList() ?? new List<StickerDto>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error mapping stickers for inventory item {ItemId}", item.Id);
            dto.Stickers = new List<StickerDto>();
        }

        return dto;
    }

    // POST: api/inventory/import-from-steam
    [HttpPost("import-from-steam")]
    public async Task<ActionResult<SteamInventoryImportService.ImportResult>> ImportFromSteam(
        [FromBody] ImportSteamInventoryRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (request.UserId <= 0)
            {
                return BadRequest(new { error = "Invalid user ID" });
            }

            if (request.Items == null || !request.Items.Any())
            {
                return BadRequest(new { error = "No items provided" });
            }

            // Verify user exists
            var user = await _context.Users.FindAsync(new object[] { request.UserId }, cancellationToken);
            if (user == null)
            {
                return BadRequest(new { error = "User not found" });
            }

            var result = await _steamImportService.ImportSteamInventoryAsync(
                request.UserId,
                request.Items,
                cancellationToken);

            _logger.LogInformation(
                "Steam inventory import completed for user {UserId}: {Imported} imported, {Skipped} skipped, {Errors} errors",
                request.UserId, result.Imported, result.Skipped, result.Errors);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing Steam inventory for user {UserId}", request.UserId);
            return StatusCode(500, new { error = "An error occurred while importing inventory" });
        }
    }

    // POST: api/inventory/refresh-from-steam
    // Fetches Steam inventory with pagination and imports it in one call
    // This avoids Vercel timeout issues by doing everything on the backend
    [HttpPost("refresh-from-steam")]
    public async Task<ActionResult<SteamInventoryImportService.ImportResult>> RefreshFromSteam(
        [FromQuery] int? userId,
        CancellationToken cancellationToken)
    {
        try
        {
            // Get userId from query param or from authenticated user
            int targetUserId;
            if (userId.HasValue)
            {
                targetUserId = userId.Value;
            }
            else
            {
                // Try to get from authenticated user
                var userIdClaim = User.FindFirst("userId")?.Value 
                    ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out targetUserId))
                {
                    return Unauthorized(new { error = "User ID is required. Please provide userId query parameter or authenticate." });
                }
            }

            // Verify user exists and get Steam ID
            var user = await _context.Users.FindAsync(new object[] { targetUserId }, cancellationToken);
            if (user == null)
            {
                return BadRequest(new { error = "User not found" });
            }

            if (string.IsNullOrEmpty(user.SteamId))
            {
                return BadRequest(new { error = "User does not have a Steam ID" });
            }

            // Validate SteamID64 format
            if (!IsValidSteamId64(user.SteamId))
            {
                _logger.LogWarning("Invalid SteamID64 format for user {UserId}: {SteamId}. Expected 17-digit number starting with 7656119", 
                    targetUserId, user.SteamId);
                return BadRequest(new { 
                    error = "Invalid Steam ID format",
                    details = "Steam ID must be a 17-digit number starting with 7656119...",
                    providedSteamId = user.SteamId
                });
            }

            _logger.LogInformation("Starting Steam inventory refresh for user {UserId} (SteamId: {SteamId})", targetUserId, user.SteamId);

            // Fetch directly from Steam Community API (inventory endpoint)
            // Note: Steam inventory is only available via Community API, not Web API
            // URL format: https://steamcommunity.com/inventory/{steamid}/730/2
            // 730 = CS:GO/CS2 app ID
            // 2 = context ID (usually 2 for CS:GO/CS2)
            const int appId = 730;
            const int contextId = 2;
            
            // Create HttpClient with automatic decompression enabled
            var handler = new System.Net.Http.HttpClientHandler
            {
                AutomaticDecompression = System.Net.DecompressionMethods.All
            };
            using var httpClient = new System.Net.Http.HttpClient(handler);
            httpClient.Timeout = TimeSpan.FromMinutes(5); // Allow enough time for large inventories
            
            // Add browser-like headers to avoid being blocked
            httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            httpClient.DefaultRequestHeaders.Add("Accept", "application/json, text/plain, */*");
            httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
            httpClient.DefaultRequestHeaders.Add("Referer", $"https://steamcommunity.com/profiles/{user.SteamId}/inventory/");
            httpClient.DefaultRequestHeaders.Add("Origin", "https://steamcommunity.com");

            // Fetch all pages with pagination
            var allAssets = new List<SteamAsset>();
            var allDescriptions = new List<SteamItemDescription>();
            var descriptionMap = new Dictionary<string, SteamItemDescription>(); // Track unique descriptions
            string? startAssetId = null;
            var hasMore = true;
            var pageCount = 0;
            const int maxPages = 50; // Safety limit

            while (hasMore && pageCount < maxPages)
            {
                pageCount++;
                
                // Build URL - start with base URL without query parameters (works better)
                // Only add start_assetid for pagination if we have one
                var steamUrl = $"https://steamcommunity.com/inventory/{user.SteamId}/{appId}/{contextId}";
                if (!string.IsNullOrEmpty(startAssetId))
                {
                    steamUrl += $"?start_assetid={startAssetId}";
                }
                
                // Log full URL (safe to log - no API keys or sensitive data)
                _logger.LogInformation("Fetching Steam inventory page {PageCount} from: {SteamUrl}", pageCount, steamUrl);
            
                try
                {
                    var response = await httpClient.GetAsync(steamUrl, cancellationToken);
                    
                    // Log response headers for debugging
                    _logger.LogDebug("Steam API response status (page {PageCount}): {StatusCode} {StatusText}", 
                        pageCount, response.StatusCode, response.ReasonPhrase);
                    _logger.LogDebug("Response headers: {Headers}", 
                        string.Join(", ", response.Headers.Select(h => $"{h.Key}={string.Join(",", h.Value)}")));
            
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync(cancellationToken);
                        _logger.LogError("Steam API error (page {PageCount}): Status={StatusCode}, Url={SteamUrl}, Error={Error}", 
                            pageCount, response.StatusCode, steamUrl, 
                            errorText.Length > 500 ? errorText.Substring(0, 500) : errorText);
                        
                        // Check for common error scenarios
                        if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
                        {
                            // 400 Bad Request could mean:
                            // - Invalid SteamID64 format (we already validated, but double-check)
                            // - Inventory is private
                            // - IP blocking
                            if (string.IsNullOrWhiteSpace(errorText))
                            {
                                return BadRequest(new { 
                                    error = "Steam returned 400 Bad Request with empty response",
                                    details = "This usually means your Steam inventory privacy is set to private. Please make your inventory public in Steam privacy settings.",
                                    steamUrl = steamUrl // Log URL for debugging
                                });
                            }
                            
                            return BadRequest(new { 
                                error = "Steam API returned 400 Bad Request",
                                details = errorText.Length > 500 ? errorText.Substring(0, 500) : errorText,
                                steamUrl = steamUrl,
                                suggestion = "Please verify: 1) Your Steam ID is correct, 2) Your inventory privacy is set to public"
                            });
                        }
                        
                return StatusCode((int)response.StatusCode, new { 
                            error = $"Steam API error: {response.StatusCode}",
                            details = errorText.Length > 500 ? errorText.Substring(0, 500) : errorText,
                            steamUrl = steamUrl
                });
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
                    
                    // Handle null response from Steam (can happen with certain query parameters)
                    if (string.IsNullOrWhiteSpace(json) || json.Trim().Equals("null", StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogWarning("Steam API returned null response (page {PageCount}). This may indicate the inventory is empty or private.", pageCount);
                        
                        // If this is the first page and we got null, it might mean private inventory
                        if (pageCount == 1)
                        {
                            return BadRequest(new { 
                                error = "Steam inventory is not accessible",
                                details = "Steam returned null response. This usually means your inventory privacy is set to private. Please make your inventory public in Steam privacy settings.",
                                steamId = user.SteamId,
                                suggestion = "Go to Steam > Settings > Privacy > Inventory Privacy and set it to Public"
                            });
                        }
                        
                        // Otherwise, break and return what we have
                        break;
                    }
                    
            var data = JsonSerializer.Deserialize<SteamInventoryResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (data == null)
            {
                        _logger.LogError("Failed to parse Steam API response (page {PageCount}). JSON: {Json}", pageCount, json.Length > 200 ? json.Substring(0, 200) : json);
                        return StatusCode(500, new { error = "Failed to parse Steam API response" });
            }

            // Check if request was successful
            if (data.Success != 1)
            {
                        _logger.LogWarning("Steam API returned unsuccessful response (page {PageCount}): Success = {Success}", 
                            pageCount, data.Success);
                        
                        // If this is the first page and it failed, return error
                        if (pageCount == 1)
                        {
                            return BadRequest(new { 
                                error = "Steam inventory is not accessible",
                                details = "Steam returned success=0. This usually means your inventory privacy is set to private. Please make your inventory public in Steam privacy settings.",
                                steamId = user.SteamId,
                                suggestion = "Go to Steam > Settings > Privacy > Inventory Privacy and set it to Public"
                            });
                        }
                        
                        // Otherwise, break and return what we have
                        break;
                    }

                    // Collect assets
                    if (data.Assets != null)
                    {
                        allAssets.AddRange(data.Assets);
                    }

                    // Collect unique descriptions (Steam may return duplicates across pages)
                    if (data.Descriptions != null)
                    {
                        foreach (var desc in data.Descriptions)
                        {
                            var key = $"{desc.ClassId}_{desc.InstanceId}";
                            if (!descriptionMap.ContainsKey(key))
                            {
                                descriptionMap[key] = desc;
                                allDescriptions.Add(desc);
                            }
                        }
                    }

                    _logger.LogInformation("Page {PageCount} - Assets: {AssetCount}, Descriptions: {DescCount}, Total so far: {TotalAssets} assets, {TotalDescs} descriptions",
                        pageCount, data.Assets?.Count ?? 0, data.Descriptions?.Count ?? 0, allAssets.Count, allDescriptions.Count);

                    // Check if there are more items to fetch
                    hasMore = data.MoreItems == 1 || (!string.IsNullOrEmpty(data.LastAssetId) && data.LastAssetId != startAssetId);
                    if (hasMore && !string.IsNullOrEmpty(data.LastAssetId))
                    {
                        startAssetId = data.LastAssetId;
                    }
                    else
                    {
                        hasMore = false;
                    }

                    // Small delay to avoid rate limiting (only if we have more pages)
                    if (hasMore)
                    {
                        await Task.Delay(200, cancellationToken);
                    }
                }
                catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
                {
                    _logger.LogError("Timeout while fetching Steam inventory page {PageCount}", pageCount);
                    return StatusCode(504, new { 
                        error = "Request timeout",
                        details = "Steam inventory may be too large. Please try again.",
                        pagesFetched = pageCount - 1
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error fetching Steam inventory page {PageCount}", pageCount);
                return StatusCode(500, new { 
                        error = "Error fetching Steam inventory",
                        details = ex.Message,
                        pagesFetched = pageCount - 1
                    });
                }
            }

            _logger.LogInformation("Finished fetching Steam inventory: {PageCount} pages, {AssetCount} total assets, {DescCount} unique descriptions",
                pageCount, allAssets.Count, allDescriptions.Count);

            if (allAssets.Count == 0)
            {
                return Ok(new SteamInventoryImportService.ImportResult
                {
                    TotalItems = 0,
                    Imported = 0,
                    Skipped = 0,
                    Errors = 0,
                    ErrorMessages = new List<string> { "No items found in Steam inventory" },
                    SkippedItems = new List<string>()
                });
            }

            // Map assets to descriptions and convert to import format
            var itemMap = new Dictionary<string, SteamItemDescription>();
            foreach (var desc in allDescriptions)
            {
                var key = $"{desc.ClassId}_{desc.InstanceId}";
                itemMap[key] = desc;
            }

            var importItems = new List<SteamInventoryItemDto>();
            foreach (var asset in allAssets)
            {
                var key = $"{asset.ClassId}_{asset.InstanceId}";
                if (itemMap.TryGetValue(key, out var description))
                {
                    // Convert relative icon URL to full Steam economy image URL
                    var imageUrl = !string.IsNullOrEmpty(description.IconUrl)
                        ? $"https://community.fastly.steamstatic.com/economy/image/{description.IconUrl}/330x192?allow_animated=1"
                        : null;

                    importItems.Add(new SteamInventoryItemDto
                    {
                        AssetId = asset.AssetId,
                        MarketHashName = description.MarketHashName ?? description.Name,
                        Name = description.Name,
                        ImageUrl = imageUrl,
                        Marketable = description.Marketable == 1,
                        Tradable = description.Tradable == 1,
                        Descriptions = description.Descriptions?.Select(d => new SteamDescriptionDto
                        {
                            Type = d.Type ?? string.Empty,
                            Value = d.Value,
                            Color = d.Color
                        }).ToList(),
                        Tags = description.Tags?.Select(t => new SteamTagDto
                        {
                            Category = t.Category ?? string.Empty,
                            LocalizedTagName = t.LocalizedTagName ?? string.Empty
                        }).ToList()
                    });
                }
            }

            _logger.LogInformation("Converted {Count} Steam items to import format. Starting import...", importItems.Count);

            // Import the items
            var result = await _steamImportService.ImportSteamInventoryAsync(
                targetUserId,
                importItems,
                cancellationToken);

            _logger.LogInformation(
                "Steam inventory refresh completed for user {UserId}: {Imported} imported, {Skipped} skipped, {Errors} errors",
                targetUserId, result.Imported, result.Skipped, result.Errors);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing Steam inventory");
            return StatusCode(500, new { error = "An error occurred while refreshing inventory from Steam", message = ex.Message });
        }
    }

    // POST: api/inventory/refresh-prices
    // Refreshes market prices for all items in a user's inventory
    [HttpPost("refresh-prices")]
    public async Task<ActionResult<RefreshPricesResult>> RefreshPrices(
        [FromQuery] int? userId,
        CancellationToken cancellationToken)
    {
        try
        {
            // Get userId from query param or from authenticated user
            int targetUserId;
            if (userId.HasValue)
            {
                targetUserId = userId.Value;
            }
            else
            {
                // Try to get from authenticated user
                var userIdClaim = User.FindFirst("userId")?.Value 
                    ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out targetUserId))
                {
                    return Unauthorized(new { error = "User ID is required. Please provide userId query parameter or authenticate." });
                }
            }

            // Verify user exists
            var user = await _context.Users.FindAsync(new object[] { targetUserId }, cancellationToken);
            if (user == null)
            {
                return BadRequest(new { error = "User not found" });
            }

            _logger.LogInformation("Starting price refresh for user {UserId}", targetUserId);

            // Get all inventory items for this user with their skins
            var inventoryItems = await _context.InventoryItems
                .Include(i => i.Skin)
                .Where(i => i.UserId == targetUserId)
                .ToListAsync(cancellationToken);

            if (inventoryItems.Count == 0)
            {
                return Ok(new RefreshPricesResult
                {
                    TotalItems = 0,
                    Updated = 0,
                    Skipped = 0,
                    Errors = 0,
                    ErrorMessages = new List<string>()
                });
            }

            // Get unique market hash names from items that have skins with MarketHashName
            var marketHashNames = inventoryItems
                .Where(i => i.Skin != null && !string.IsNullOrWhiteSpace(i.Skin.MarketHashName))
                .Select(i => i.Skin!.MarketHashName!)
                .Distinct()
                .ToList();

            if (marketHashNames.Count == 0)
            {
                _logger.LogWarning("No items with MarketHashName found for user {UserId}. Cannot refresh prices.", targetUserId);
                return Ok(new RefreshPricesResult
                {
                    TotalItems = inventoryItems.Count,
                    Updated = 0,
                    Skipped = inventoryItems.Count,
                    Errors = 0,
                    ErrorMessages = new List<string> { "No items with market hash names found. Prices cannot be refreshed." }
                });
            }

            _logger.LogInformation("Fetching market prices for {Count} unique items...", marketHashNames.Count);

            // Fetch market prices with rate limiting
            var marketPrices = await _steamApiService.GetMarketPricesAsync(
                marketHashNames,
                appId: 730,
                delayMs: 200, // 200ms delay between requests to avoid rate limiting
                cancellationToken);

            var pricesFound = marketPrices.Values.Count(p => p.HasValue);
            _logger.LogInformation("Fetched market prices for {Found}/{Total} items", pricesFound, marketHashNames.Count);

            // Update prices for all items
            var result = new RefreshPricesResult
            {
                TotalItems = inventoryItems.Count,
                Updated = 0,
                Skipped = 0,
                Errors = 0,
                ErrorMessages = new List<string>()
            };

            foreach (var item in inventoryItems)
            {
                try
                {
                    if (item.Skin == null || string.IsNullOrWhiteSpace(item.Skin.MarketHashName))
                    {
                        result.Skipped++;
                        continue;
                    }

                    if (marketPrices.TryGetValue(item.Skin.MarketHashName, out var price) && price.HasValue)
                    {
                        var oldPrice = item.Price;
                        item.Price = price.Value;
                        result.Updated++;
                        
                        _logger.LogDebug("Updated price for item {ItemId} ({MarketHashName}): ${OldPrice} -> ${NewPrice}",
                            item.Id, item.Skin.MarketHashName, oldPrice, price.Value);
                    }
                    else
                    {
                        result.Skipped++;
                        _logger.LogDebug("No market price available for item {ItemId} ({MarketHashName})",
                            item.Id, item.Skin.MarketHashName);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating price for item {ItemId}", item.Id);
                    result.Errors++;
                    result.ErrorMessages.Add($"Error updating item {item.Id}: {ex.Message}");
                }
            }

            // Save all changes
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Price refresh completed for user {UserId}: {Updated} updated, {Skipped} skipped, {Errors} errors",
                targetUserId, result.Updated, result.Skipped, result.Errors);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing prices");
            return StatusCode(500, new { error = "An error occurred while refreshing prices", message = ex.Message });
        }
    }
}

public class RefreshPricesResult
{
    public int TotalItems { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public int Errors { get; set; }
    public List<string> ErrorMessages { get; set; } = new();
}

public class ImportSteamInventoryRequest
{
    public int UserId { get; set; }
    public List<SteamInventoryItemDto> Items { get; set; } = new();
}

// DTOs for Steam API response
public class SteamInventoryResponse
{
    public int Success { get; set; }
    public int? MoreItems { get; set; }
    public string? LastAssetId { get; set; }
    public List<SteamAsset>? Assets { get; set; }
    public List<SteamItemDescription>? Descriptions { get; set; }
}

public class SteamAsset
{
    public string AssetId { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string InstanceId { get; set; } = string.Empty;
}

public class SteamItemDescription
{
    public string ClassId { get; set; } = string.Empty;
    public string InstanceId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? MarketHashName { get; set; }
    public string? IconUrl { get; set; }
    public int Tradable { get; set; }
    public int Marketable { get; set; }
    public string Type { get; set; } = string.Empty;
    public List<SteamDescription>? Descriptions { get; set; }
    public List<SteamTag>? Tags { get; set; }
}

public class SteamDescription
{
    public string? Type { get; set; }
    public string? Value { get; set; }
    public string? Color { get; set; }
}

public class SteamTag
{
    public string? Category { get; set; }
    public string? LocalizedTagName { get; set; }
}

