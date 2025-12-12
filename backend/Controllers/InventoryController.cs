using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Text.Json;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using System.IO;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InventoryController> _logger;
    private readonly DopplerPhaseService _dopplerPhaseService;
    private readonly SteamInventoryImportService _steamImportService;
    private readonly SteamApiService _steamApiService;
    private readonly CsMarketApiService _csMarketApiService;
    private const decimal SteamWalletLimit = 2000m;
    private const string DebugLogPath = "/Users/danielostensen/commonplace/csInvTracker/.cursor/debug.log";
    private static readonly object DebugLogLock = new();

    public InventoryController(
        ApplicationDbContext context,
        DopplerPhaseService dopplerPhaseService,
        ILogger<InventoryController> logger,
        SteamInventoryImportService steamImportService,
        SteamApiService steamApiService,
        CsMarketApiService csMarketApiService)
    {
        _context = context;
        _dopplerPhaseService = dopplerPhaseService;
        _logger = logger;
        _steamImportService = steamImportService;
        _steamApiService = steamApiService;
        _csMarketApiService = csMarketApiService;
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
                MarketHashName = item.SteamMarketHashName?.Trim(),
                Rarity = "Unknown",
                Type = "Unknown",
                Collection = null,
                Weapon = null,
                Float = item.Float,
                Exterior = item.Exterior,
                PaintSeed = item.PaintSeed,
                Price = item.Price,
                Cost = item.Cost,
                PriceExceedsSteamLimit = item.Price > SteamWalletLimit,
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
            MarketHashName = item.SteamMarketHashName?.Trim()
                ?? item.Skin.MarketHashName?.Trim()
                ?? item.Skin.Name,
            Rarity = item.Skin.Rarity ?? "Unknown",
            Type = item.Skin.Type ?? "Unknown",
            Collection = item.Skin.Collection,
            Weapon = item.Skin.Weapon,
            Float = item.Float,
            Exterior = item.Exterior,
            PaintSeed = item.PaintSeed,
            Price = item.Price,
            Cost = item.Cost,
            PriceExceedsSteamLimit = item.Price > SteamWalletLimit,
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
                fetchMarketPrices: true,
                cancellationToken: cancellationToken);

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

            // Verify user exists
            var user = await _context.Users.FindAsync(new object[] { targetUserId }, cancellationToken);
            if (user == null)
            {
                return BadRequest(new { error = "User not found" });
            }

            return await RefreshFromSteamInternal(user, targetUserId, fetchMarketPrices: true, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing Steam inventory");
            return StatusCode(500, new { error = "An error occurred while refreshing inventory from Steam", message = ex.Message });
        }
    }

    // POST: api/inventory/refresh-floats
    // Refreshes floats and exterior data without re-querying CSMarket
    [HttpPost("refresh-floats")]
    public async Task<ActionResult<SteamInventoryImportService.ImportResult>> RefreshFloatsFromSteam(
        [FromQuery] int? userId,
        CancellationToken cancellationToken)
    {
        try
        {
            int targetUserId;
            if (userId.HasValue)
            {
                targetUserId = userId.Value;
            }
            else
            {
                var userIdClaim = User.FindFirst("userId")?.Value 
                    ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out targetUserId))
                {
                    return Unauthorized(new { error = "User ID is required. Please provide userId query parameter or authenticate." });
                }
            }

            var user = await _context.Users.FindAsync(new object[] { targetUserId }, cancellationToken);
            if (user == null)
            {
                return BadRequest(new { error = "User not found" });
            }

            return await RefreshFromSteamInternal(user, targetUserId, fetchMarketPrices: false, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing floats from Steam");
            return StatusCode(500, new { error = "An error occurred while refreshing floats from Steam", message = ex.Message });
        }
    }

    private async Task<ActionResult<SteamInventoryImportService.ImportResult>> RefreshFromSteamInternal(
        User user,
        int targetUserId,
        bool fetchMarketPrices,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrEmpty(user.SteamId))
            {
                return BadRequest(new { error = "User does not have a Steam ID" });
            }

            if (!IsValidSteamId64(user.SteamId))
            {
                _logger.LogWarning("Invalid SteamID64 format for user {UserId}: {SteamId}. Expected 17-digit number starting with 7656119", 
                    targetUserId, user.SteamId);
                return BadRequest(new
                {
                    error = "Invalid Steam ID format",
                    details = "Steam ID must be a 17-digit number starting with 7656119...",
                    providedSteamId = user.SteamId
                });
            }

            var operationLabel = fetchMarketPrices ? "inventory refresh" : "float refresh";
            _logger.LogInformation("Starting Steam {Operation} for user {UserId} (SteamId: {SteamId})", operationLabel, targetUserId, user.SteamId);

            const int appId = 730;
            const int contextId = 2;

            var handler = new System.Net.Http.HttpClientHandler
            {
                AutomaticDecompression = System.Net.DecompressionMethods.All
            };
            using var httpClient = new System.Net.Http.HttpClient(handler);
            httpClient.Timeout = TimeSpan.FromMinutes(5);

            httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            httpClient.DefaultRequestHeaders.Add("Accept", "application/json, text/plain, */*");
            httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
            httpClient.DefaultRequestHeaders.Add("Referer", $"https://steamcommunity.com/profiles/{user.SteamId}/inventory/");
            httpClient.DefaultRequestHeaders.Add("Origin", "https://steamcommunity.com");

            var allAssets = new List<SteamAsset>();
            var allDescriptions = new List<SteamItemDescription>();
            var descriptionMap = new Dictionary<string, SteamItemDescription>();
            string? startAssetId = null;
            var hasMore = true;
            var pageCount = 0;
            const int maxPages = 50;

            while (hasMore && pageCount < maxPages)
            {
                pageCount++;
                var steamUrl = $"https://steamcommunity.com/inventory/{user.SteamId}/{appId}/{contextId}";
                if (!string.IsNullOrEmpty(startAssetId))
                {
                    steamUrl += $"?start_assetid={startAssetId}";
                }

                _logger.LogInformation("Fetching Steam inventory page {PageCount} from: {SteamUrl}", pageCount, steamUrl);

                try
                {
                    var response = await httpClient.GetAsync(steamUrl, cancellationToken);

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

                        if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
                        {
                            if (string.IsNullOrWhiteSpace(errorText))
                            {
                                return BadRequest(new
                                {
                                    error = "Steam returned 400 Bad Request with empty response",
                                    details = "This usually means your Steam inventory privacy is set to private. Please make your inventory public in Steam privacy settings.",
                                    steamUrl = steamUrl
                                });
                            }

                            return BadRequest(new
                            {
                                error = "Steam API returned 400 Bad Request",
                                details = errorText.Length > 500 ? errorText.Substring(0, 500) : errorText,
                                steamUrl = steamUrl,
                                suggestion = "Please verify: 1) Your Steam ID is correct, 2) Your inventory privacy is set to public"
                            });
                        }

                        return StatusCode((int)response.StatusCode, new
                        {
                            error = $"Steam API error: {response.StatusCode}",
                            details = errorText.Length > 500 ? errorText.Substring(0, 500) : errorText,
                            steamUrl = steamUrl
                        });
                    }

                    var json = await response.Content.ReadAsStringAsync(cancellationToken);

                    if (string.IsNullOrWhiteSpace(json) || json.Trim().Equals("null", StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogWarning("Steam API returned null response (page {PageCount}). This may indicate the inventory is empty or private.", pageCount);

                        if (pageCount == 1)
                        {
                            return BadRequest(new
                            {
                                error = "Steam inventory is not accessible",
                                details = "Steam returned null response. This usually means your inventory privacy is set to private. Please make your inventory public in Steam privacy settings.",
                                steamId = user.SteamId,
                                suggestion = "Go to Steam > Settings > Privacy > Inventory Privacy and set it to Public"
                            });
                        }

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

                    if (data.Success != 1)
                    {
                        _logger.LogWarning("Steam API returned unsuccessful response (page {PageCount}): Success = {Success}", 
                            pageCount, data.Success);

                        if (pageCount == 1)
                        {
                            return BadRequest(new
                            {
                                error = "Steam inventory is not accessible",
                                details = "Steam returned success=0. This usually means your inventory privacy is set to private. Please make your inventory public in Steam privacy settings.",
                                steamId = user.SteamId,
                                suggestion = "Go to Steam > Settings > Privacy > Inventory Privacy and set it to Public"
                            });
                        }

                        break;
                    }

                    if (data.Assets != null)
                    {
                        allAssets.AddRange(data.Assets);
                    }

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

                    hasMore = data.MoreItems == 1 || (!string.IsNullOrEmpty(data.LastAssetId) && data.LastAssetId != startAssetId);
                    if (hasMore && !string.IsNullOrEmpty(data.LastAssetId))
                    {
                        startAssetId = data.LastAssetId;
                    }
                    else
                    {
                        hasMore = false;
                    }

                    if (hasMore)
                    {
                        await Task.Delay(200, cancellationToken);
                    }
                }
                catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
                {
                    _logger.LogError("Timeout while fetching Steam inventory page {PageCount}", pageCount);
                    return StatusCode(504, new
                    {
                        error = "Request timeout",
                        details = "Steam inventory may be too large. Please try again.",
                        pagesFetched = pageCount - 1
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error fetching Steam inventory page {PageCount}", pageCount);
                    return StatusCode(500, new
                    {
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
                    var imageUrl = !string.IsNullOrEmpty(description.IconUrl)
                        ? $"https://community.fastly.steamstatic.com/economy/image/{description.IconUrl}/330x192?allow_animated=1"
                        : null;

                    var inspectLink = BuildInspectLink(description, asset, user.SteamId);

                    importItems.Add(new SteamInventoryItemDto
                    {
                        AssetId = asset.AssetId,
                        MarketHashName = description.MarketHashName ?? description.Name,
                        Name = description.Name,
                        Type = description.Type,
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
                        }).ToList(),
                        InspectLink = inspectLink
                    });
                }
            }

            _logger.LogInformation("Converted {Count} Steam items to import format. Starting import...", importItems.Count);

            var result = await _steamImportService.ImportSteamInventoryAsync(
                targetUserId,
                importItems,
                fetchMarketPrices,
                cancellationToken);

            _logger.LogInformation(
                "Steam {Operation} completed for user {UserId}: {Imported} imported, {Skipped} skipped, {Errors} errors",
                operationLabel, targetUserId, result.Imported, result.Skipped, result.Errors);

            return Ok(result);
        }
        catch (Exception ex)
        {
            var contextMessage = fetchMarketPrices ? "refreshing inventory from Steam" : "refreshing floats from Steam";
            _logger.LogError(ex, "Error {Context}", contextMessage);
            return StatusCode(500, new { error = $"An error occurred while {contextMessage}", message = ex.Message });
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

            if (!_csMarketApiService.IsConfigured)
            {
                var message = "CSMarket API key not configured. Set CSMARKET_API_KEY to enable price refresh.";
                _logger.LogWarning(message);
                return Ok(new RefreshPricesResult
                {
                    TotalItems = inventoryItems.Count,
                    Updated = 0,
                    Skipped = inventoryItems.Count,
                    Errors = 0,
                    ErrorMessages = new List<string> { message }
                });
            }

            var itemCandidates = inventoryItems
                .Select(item => new
                {
                    Item = item,
                    Candidates = BuildMarketHashCandidates(item)
                })
                .ToList();

            foreach (var entry in itemCandidates)
            {
                var item = entry.Item;
                var candidates = string.Join(", ", entry.Candidates);
                _logger.LogDebug(
                    "Price refresh item {ItemId}: candidates [{Candidates}], steamHash={SteamHash}, skinHash={SkinHash}, exterior={Exterior}, float={Float}",
                    item.Id,
                    candidates,
                    item.SteamMarketHashName?.Trim(),
                    item.Skin?.MarketHashName?.Trim(),
                    item.Exterior,
                    item.Float);
            }

            var marketHashNames = itemCandidates
                .SelectMany(x => x.Candidates)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (marketHashNames.Count == 0)
            {
                _logger.LogWarning("No market hash names available for user {UserId}. Cannot refresh prices.", targetUserId);
                return Ok(new RefreshPricesResult
                {
                    TotalItems = inventoryItems.Count,
                    Updated = 0,
                    Skipped = inventoryItems.Count,
                    Errors = 0,
                    ErrorMessages = new List<string> { "No items with market hash names found. Prices cannot be refreshed." }
                });
            }

            var marketFilters = ParseMarkets(Request);
            if (marketFilters.Count > 0)
            {
                _logger.LogInformation(
                    "Fetching CSMarket prices for {Count} unique items across markets: {Markets}",
                    marketHashNames.Count,
                    string.Join(", ", marketFilters));
            }
            else
            {
                _logger.LogInformation("Fetching CSMarket prices for {Count} unique items (all markets)...", marketHashNames.Count);
            }

            var marketPrices = await _csMarketApiService.GetBestListingPricesAsync(
                marketHashNames,
                marketFilters.Count > 0 ? marketFilters : null,
                delayMs: 200,
                cancellationToken: cancellationToken);

            var pricesFound = marketPrices.Values.Count(p => p.HasValue);
            _logger.LogInformation("Fetched CSMarket prices for {Found}/{Total} items", pricesFound, marketHashNames.Count);

            // Update prices for all items
            var result = new RefreshPricesResult
            {
                TotalItems = inventoryItems.Count,
                Updated = 0,
                Skipped = 0,
                Errors = 0,
                ErrorMessages = new List<string>()
            };

            if (_csMarketApiService.EncounteredRateLimit)
            {
                result.RateLimited = true;

                if (_csMarketApiService.RateLimitMessages.Count > 0)
                {
                    foreach (var detail in _csMarketApiService.RateLimitMessages.Distinct().Take(5))
                    {
                        result.InfoMessages.Add(detail);
                    }
                }
                else
                {
                    result.InfoMessages.Add("CSMarket rate limit reached. Some items may not have updated. Please try again shortly.");
                }

                _logger.LogWarning("CSMarket rate limit encountered during price refresh for user {UserId}", targetUserId);
            }

            foreach (var entry in itemCandidates)
            {
                var item = entry.Item;
                try
                {
                    string? matchedHash = null;
                    decimal? matchedPrice = null;

                    foreach (var candidate in entry.Candidates)
                    {
                        if (marketPrices.TryGetValue(candidate, out var price) && price.HasValue)
                        {
                            matchedHash = candidate;
                            matchedPrice = price.Value;
                            break;
                        }
                    }

                    if (!matchedPrice.HasValue)
                    {
                        result.Skipped++;
                        _logger.LogDebug(
                            "No market price available for item {ItemId}. Candidates tried: {Candidates}",
                            item.Id,
                            string.Join(", ", entry.Candidates));
                        continue;
                    }

                    var oldPrice = item.Price;
                    item.Price = matchedPrice.Value;
                    item.SteamMarketHashName = matchedHash;
                    result.Updated++;

                    _logger.LogDebug(
                        "Updated price for item {ItemId} using {MarketHashName}: ${OldPrice} -> ${NewPrice}",
                        item.Id,
                        matchedHash,
                        oldPrice,
                        matchedPrice.Value);
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

    private static IReadOnlyList<string> ParseMarkets(HttpRequest request)
    {
        if (request.Query.TryGetValue("markets", out var values) == false || values.Count == 0)
        {
            return Array.Empty<string>();
        }

        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var value in values)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            var parts = value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var part in parts)
            {
                if (!string.IsNullOrWhiteSpace(part))
                {
                    set.Add(part.ToUpperInvariant());
                }
            }
        }

        return set.Count == 0 ? Array.Empty<string>() : set.ToList();
    }

    private static IReadOnlyList<string> BuildMarketHashCandidates(InventoryItem item)
    {
        var candidates = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void AddWithExteriorVariants(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return;
            }

            var trimmed = value.Trim();
            if (string.IsNullOrEmpty(trimmed))
            {
                return;
            }

            candidates.Add(trimmed);

            if (ShouldAppendExterior(item) && !trimmed.Contains('(') && !string.IsNullOrWhiteSpace(item.Exterior))
            {
                var formattedExterior = NormalizeExterior(item.Exterior);
                candidates.Add($"{trimmed} ({formattedExterior})");
            }
        }

        AddWithExteriorVariants(item.SteamMarketHashName);
        AddWithExteriorVariants(item.Skin?.MarketHashName);

        if (!string.IsNullOrWhiteSpace(item.Skin?.Name))
        {
            AddWithExteriorVariants(item.Skin!.Name);
        }

        // As a last resort, add plain weapon name + exterior (e.g., "AK-47 | Fire Serpent (Field-Tested)")
        if (ShouldAppendExterior(item) &&
            !string.IsNullOrWhiteSpace(item.Skin?.Name) &&
            !string.IsNullOrWhiteSpace(item.Exterior))
        {
            var formattedExterior = NormalizeExterior(item.Exterior);
            candidates.Add($"{item.Skin!.Name.Trim()} ({formattedExterior})");
        }

        var result = candidates.ToList();

#region agent log
        DebugLog(
            hypothesisId: "H2",
            location: "InventoryController.BuildMarketHashCandidates",
            message: "Built market hash candidates",
            data: new
            {
                itemId = item.Id,
                item.SteamMarketHashName,
                item.Exterior,
                Candidates = result
            });
#endregion

        return result;
    }

    private static bool ShouldAppendExterior(InventoryItem item)
    {
        if (string.IsNullOrWhiteSpace(item.Exterior))
        {
            return false;
        }

        var type = item.Skin?.Type ?? string.Empty;
        var weapon = item.Skin?.Weapon ?? string.Empty;

        // Items with a weapon or glove/knife types rely on exterior for pricing.
        if (!string.IsNullOrWhiteSpace(weapon))
        {
            return true;
        }

        if (type.Contains("Glove", StringComparison.OrdinalIgnoreCase) ||
            type.Contains("Knife", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }

    private static string NormalizeExterior(string exterior)
    {
        return exterior switch
        {
            "Factory New" => "Factory New",
            "Minimal Wear" => "Minimal Wear",
            "Field-Tested" => "Field-Tested",
            "Well-Worn" => "Well-Worn",
            "Battle-Scarred" => "Battle-Scarred",
            _ => exterior.Trim()
        };
    }

    private static string? BuildInspectLink(SteamItemDescription description, SteamAsset asset, string ownerSteamId)
    {
        if (string.IsNullOrWhiteSpace(ownerSteamId))
        {
            return null;
        }

        static SteamAction? FindInspectAction(List<SteamAction>? actions) =>
            actions?.FirstOrDefault(a =>
                !string.IsNullOrWhiteSpace(a?.Link) &&
                (a?.Name?.Contains("Inspect", StringComparison.OrdinalIgnoreCase) ?? false));

        var action = FindInspectAction(description.Actions) ?? FindInspectAction(description.MarketActions);
        if (action?.Link == null)
        {
            return null;
        }

        var contextId = string.IsNullOrWhiteSpace(asset.ContextId) ? "2" : asset.ContextId!;

        var link = action.Link
            .Replace("%owner_steamid%", ownerSteamId, StringComparison.OrdinalIgnoreCase)
            .Replace("%original_owner_steamid%", ownerSteamId, StringComparison.OrdinalIgnoreCase)
            .Replace("%assetid%", asset.AssetId, StringComparison.OrdinalIgnoreCase)
            .Replace("%classid%", asset.ClassId, StringComparison.OrdinalIgnoreCase)
            .Replace("%instanceid%", asset.InstanceId, StringComparison.OrdinalIgnoreCase)
            .Replace("%contextid%", contextId, StringComparison.OrdinalIgnoreCase);

        return link;
    }
}

public class RefreshPricesResult
{
    public int TotalItems { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public int Errors { get; set; }
    public List<string> ErrorMessages { get; set; } = new();
    public bool RateLimited { get; set; }
    public List<string> InfoMessages { get; set; } = new();
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
    public string? ContextId { get; set; }
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
    public List<SteamAction>? Actions { get; set; }
    public List<SteamAction>? MarketActions { get; set; }
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

public class SteamAction
{
    public string? Name { get; set; }
    public string? Link { get; set; }
}

