using Microsoft.AspNetCore.Mvc;
using backend.Authorization;
using backend.DTOs.Admin;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[AdminAuthorize]
public class AdminController : ControllerBase
{
    private readonly AdminDashboardService _adminService;
    private readonly SkinImportService _skinImportService;
    private readonly SteamCatalogRefreshService _steamCatalogRefreshService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        AdminDashboardService adminService, 
        SkinImportService skinImportService,
        SteamCatalogRefreshService steamCatalogRefreshService,
        ILogger<AdminController> logger)
    {
        _adminService = adminService;
        _skinImportService = skinImportService;
        _steamCatalogRefreshService = steamCatalogRefreshService;
        _logger = logger;
    }

    // GET: api/admin/users
    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetAllUsers()
    {
        try
        {
            var users = await _adminService.GetAllUsersAsync();
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching users");
            return StatusCode(500, new { error = "An error occurred while fetching users" });
        }
    }

    // GET: api/admin/users/{userId}/inventory
    [HttpGet("users/{userId:int}/inventory")]
    public async Task<ActionResult<object>> GetUserInventory(
        [FromRoute] int userId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 25)
    {
        if (take is < 1 or > 200) take = 25;
        if (skip < 0) skip = 0;

        try
        {
            var (items, total) = await _adminService.GetUserInventoryPageAsync(userId, skip, take);
            return Ok(new
            {
                total,
                skip,
                take,
                items
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory for user {UserId}", userId);
            return StatusCode(500, new { error = "An error occurred while fetching the user inventory" });
        }
    }

    // PUT: api/admin/users/{userId}/inventory/{inventoryItemId}
    [HttpPut("users/{userId:int}/inventory/{inventoryItemId:int}")]
    public async Task<ActionResult<InventoryItemDto>> UpdateUserInventoryItem(
        [FromRoute] int userId,
        [FromRoute] int inventoryItemId,
        [FromBody] UpdateInventoryItemDto dto)
    {
        try
        {
            var updated = await _adminService.UpdateInventoryItemAsync(userId, inventoryItemId, dto);
            if (updated == null)
            {
                return NotFound(new { error = "Inventory item not found for this user" });
            }
            return Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating inventory item {InventoryItemId} for user {UserId}", inventoryItemId, userId);
            return StatusCode(500, new { error = "An error occurred while updating the inventory item" });
        }
    }

    // GET: api/admin/stats
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStats>> GetSystemStats()
    {
        try
        {
            var stats = await _adminService.GetSystemStatsAsync();
            return Ok(stats);
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
            var newSkin = await _adminService.CreateSkinAsync(dto);
            return CreatedAtAction(nameof(CreateSkin), new { id = newSkin.Id }, newSkin);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to create skin {SkinName}", dto.Name);
            return BadRequest(new { error = ex.Message });
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
        var stats = await _adminService.GetSkinStatsAsync();
        return Ok(stats);
    }

    [HttpDelete("clear-skins")]
    public async Task<ActionResult> ClearAllSkins()
    {
        try
        {
            var deletedCount = await _adminService.ClearSkinsAsync();
            return Ok(new
            {
                Message = $"Deleted {deletedCount} skins (kept skins with inventory items)",
                Deleted = deletedCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing skins");
            return StatusCode(500, new { Message = $"Failed to clear skins: {ex.Message}" });
        }
    }

    [HttpDelete("inventory")]
    public async Task<ActionResult> ClearAllInventory()
    {
        try
        {
            var deletedCount = await _adminService.ClearAllInventoryAsync();
            return Ok(new
            {
                Message = $"Deleted {deletedCount} inventory items. Users will need to re-import.",
                Deleted = deletedCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing inventory items");
            return StatusCode(500, new { Message = $"Failed to clear inventory items: {ex.Message}" });
        }
    }

    [HttpPost("import-from-bymykel")]
    public async Task<IActionResult> ImportFromByMykel(CancellationToken cancellationToken)
    {
        try
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing from ByMykel");
            return StatusCode(500, new { error = "An error occurred while importing from ByMykel", message = ex.Message });
        }
    }

    [HttpPost("refresh-from-steam")]
    public async Task<IActionResult> RefreshFromSteam(CancellationToken cancellationToken)
    {
        try
        {
            var result = await _steamCatalogRefreshService.RefreshFromSteamInventoriesAsync(cancellationToken);

            return Ok(new
            {
                Success = result.Errors.Count == 0,
                TotalItemsFound = result.TotalItemsFound,
                Created = result.Created,
                Updated = result.Updated,
                Skipped = result.Skipped,
                Errors = result.Errors,
                Message = result.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing catalog from Steam");
            return StatusCode(500, new { error = "An error occurred while refreshing catalog from Steam", message = ex.Message });
        }
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
            var results = await _adminService.BulkImportInventoryAsync(request);
            return Ok(results);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Bulk import validation failed for user {UserId}", request.UserId);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk importing inventory");
            return StatusCode(500, new { error = "An error occurred while bulk importing inventory", message = ex.Message });
        }
    }

    // POST: api/admin/import-inventory-csv
    [HttpPost("import-inventory-csv")]
    public async Task<ActionResult<BulkImportInventoryResult>> ImportInventoryFromCsv(
        [FromForm] int userId,
        [FromForm] IFormFile file)
    {
        try
        {
            var results = await _adminService.ImportInventoryFromCsvAsync(userId, file);
            return Ok(results);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "CSV import validation failed for user {UserId}", userId);
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "CSV import user validation failed for user {UserId}", userId);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing inventory from CSV");
            return StatusCode(500, new { error = "An error occurred while importing inventory from CSV", message = ex.Message });
        }
    }
}

