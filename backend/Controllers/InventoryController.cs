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

    public InventoryController(
        ApplicationDbContext context,
        DopplerPhaseService dopplerPhaseService,
        ILogger<InventoryController> logger,
        SteamInventoryImportService steamImportService,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _dopplerPhaseService = dopplerPhaseService;
        _logger = logger;
        _steamImportService = steamImportService;
        _httpClientFactory = httpClientFactory;
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
                TradableAfter = dto.TradeProtected ? DateTime.UtcNow.AddDays(7) : null,
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
            if (dto.TradeProtected && !item.TradeProtected)
            {
                // Newly protected
                item.TradeProtected = true;
                item.TradableAfter = DateTime.UtcNow.AddDays(7);
            }
            else if (!dto.TradeProtected)
            {
                // Protection removed
                item.TradeProtected = false;
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

        var phaseInfo = _dopplerPhaseService.GetPhaseInfo(item.Skin.PaintIndex);
        if (phaseInfo != null)
        {
            dto.DopplerPhase = phaseInfo.Phase;
            dto.DopplerPhaseImageUrl = phaseInfo.ImageUrl;
        }

        // Map stickers
        dto.Stickers = item.Stickers?.Select(s => new StickerDto
        {
            Id = s.Id,
            Name = s.Name,
            Price = s.Price,
            Slot = s.Slot,
            ImageUrl = s.ImageUrl
        }).ToList() ?? new List<StickerDto>();

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

            _logger.LogInformation("Starting Steam inventory refresh for user {UserId} (SteamId: {SteamId})", targetUserId, user.SteamId);

            // Fetch Steam inventory with pagination
            // Use Steam Community inventory API (doesn't require API key)
            // Format: https://steamcommunity.com/inventory/{steamId}/{appId}/{contextId}?l=english&count=5000
            
            // Create HttpClient with automatic decompression enabled
            // Steam returns gzip-compressed responses that need to be automatically decompressed
            var handler = new System.Net.Http.HttpClientHandler
            {
                AutomaticDecompression = System.Net.DecompressionMethods.All
            };
            using var httpClient = new System.Net.Http.HttpClient(handler);
            httpClient.Timeout = TimeSpan.FromMinutes(5); // Allow enough time for large inventories
            
            // Add browser-like headers to avoid being blocked
            httpClient.DefaultRequestHeaders.Clear();
            httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            httpClient.DefaultRequestHeaders.Add("Accept", "application/json, text/plain, */*");
            httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
            httpClient.DefaultRequestHeaders.Add("Accept-Encoding", "gzip, deflate, br");
            httpClient.DefaultRequestHeaders.Add("Referer", $"https://steamcommunity.com/profiles/{user.SteamId}/inventory/");
            httpClient.DefaultRequestHeaders.Add("Origin", "https://steamcommunity.com");
            
            var allAssets = new List<SteamAsset>();
            var allDescriptions = new List<SteamItemDescription>();
            var descriptionMap = new Dictionary<string, SteamItemDescription>();
            
            string? startAssetId = null;
            bool hasMore = true;
            int pageCount = 0;
            const int maxPages = 100; // Safety limit

            while (hasMore && pageCount < maxPages)
            {
                pageCount++;
                
                // Build URL with pagination
                var steamUrl = $"https://steamcommunity.com/inventory/{user.SteamId}/730/2?l=english&count=5000";
                if (startAssetId != null)
                {
                    steamUrl += $"&start_assetid={startAssetId}";
                }
                
                _logger.LogInformation("Fetching Steam inventory page {Page} for user {UserId}", pageCount, targetUserId);
                
                var response = await httpClient.GetAsync(steamUrl, cancellationToken);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorText = await response.Content.ReadAsStringAsync(cancellationToken);
                    var contentType = response.Content.Headers.ContentType?.MediaType ?? "unknown";
                    
                    _logger.LogError("Steam Community inventory API error (page {Page}): {StatusCode} - ContentType: {ContentType} - Error: {Error}", 
                        pageCount, response.StatusCode, contentType, errorText.Length > 1000 ? errorText.Substring(0, 1000) : errorText);
                    
                    // Log response headers for debugging
                    _logger.LogError("Response headers: {Headers}", 
                        string.Join(", ", response.Headers.Select(h => $"{h.Key}: {string.Join(", ", h.Value)}")));
                    
                    // 400 Bad Request - check if it's HTML (Steam might be returning an error page)
                    if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
                    {
                        // If Steam returns HTML, it might be a rate limit or blocking page
                        if (contentType.Contains("text/html"))
                        {
                            _logger.LogWarning("Steam returned HTML instead of JSON. This might indicate rate limiting or IP blocking.");
                            return BadRequest(new { 
                                error = "Steam returned an error page",
                                details = "Steam may be rate limiting or blocking the request. The response was HTML instead of JSON. Please try again in a few minutes.",
                                statusCode = (int)response.StatusCode,
                                contentType = contentType,
                                steamUrl = steamUrl,
                                responsePreview = errorText.Length > 500 ? errorText.Substring(0, 500) : errorText
                            });
                        }
                        
                        return BadRequest(new { 
                            error = "Steam inventory is not accessible",
                            details = "The inventory may be set to private, or the Steam ID may be invalid. Please ensure the inventory privacy settings allow public viewing.",
                            statusCode = (int)response.StatusCode,
                            contentType = contentType,
                            steamUrl = steamUrl,
                            responsePreview = errorText.Length > 500 ? errorText.Substring(0, 500) : errorText
                        });
                    }
                    
                    return StatusCode((int)response.StatusCode, new { 
                        error = $"Steam API error: {response.StatusCode}",
                        details = errorText.Length > 500 ? errorText.Substring(0, 500) : errorText,
                        statusCode = (int)response.StatusCode,
                        contentType = contentType
                    });
                }

                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                var data = JsonSerializer.Deserialize<SteamInventoryResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (data == null)
                {
                    _logger.LogError("Failed to parse Steam API response (page {Page})", pageCount);
                    return StatusCode(500, new { error = "Failed to parse Steam API response" });
                }

                // Check if request was successful
                if (data.Success != 1)
                {
                    _logger.LogWarning("Steam API returned unsuccessful response (page {Page}): Success = {Success}", pageCount, data.Success);
                    if (pageCount == 1)
                    {
                        return StatusCode(500, new { 
                            error = "Steam API returned unsuccessful response",
                            details = $"Success: {data.Success}"
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

                // Collect unique descriptions
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

                _logger.LogInformation("Page {Page} - Assets: {AssetCount}, Descriptions: {DescCount}, Total so far: {TotalAssets} assets, {TotalDescs} descriptions",
                    pageCount, data.Assets?.Count ?? 0, data.Descriptions?.Count ?? 0, allAssets.Count, allDescriptions.Count);

                // Check if there are more items to fetch
                // Steam indicates more items via MoreItems == 1, and provides LastAssetId for pagination
                // We can only continue if we have both: MoreItems == 1 AND a valid LastAssetId that's different from current
                if (data.MoreItems == 1 && data.LastAssetId != null && data.LastAssetId != startAssetId)
                {
                    // We have more items and a valid asset ID to continue with
                    hasMore = true;
                    startAssetId = data.LastAssetId;
                }
                else if (data.MoreItems == 1 && data.LastAssetId == null)
                {
                    // Steam says there are more items, but didn't provide LastAssetId
                    // This is an API inconsistency - log warning and stop to avoid infinite loop
                    _logger.LogWarning("Steam API indicates more items (MoreItems=1) but LastAssetId is null. Cannot continue pagination. Page: {Page}", pageCount);
                    hasMore = false;
                }
                else if (data.MoreItems == 1 && data.LastAssetId == startAssetId)
                {
                    // Steam says there are more items, but LastAssetId hasn't changed
                    // This could cause an infinite loop - log warning and stop
                    _logger.LogWarning("Steam API indicates more items (MoreItems=1) but LastAssetId hasn't changed. Stopping pagination to avoid infinite loop. Page: {Page}, LastAssetId: {LastAssetId}", pageCount, data.LastAssetId);
                    hasMore = false;
                }
                else
                {
                    // No more items indicated (MoreItems != 1)
                    hasMore = false;
                }

                // Small delay to avoid rate limiting
                if (hasMore)
                {
                    await Task.Delay(200, cancellationToken);
                }
            }

            _logger.LogInformation("Finished fetching Steam inventory: {PageCount} pages, {TotalAssets} total assets, {TotalDescs} unique descriptions",
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

