using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LoadoutsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LoadoutsController> _logger;
    private readonly AuthService _authService;
    private const int MaxLoadoutsPerUser = 2;

    public LoadoutsController(
        ApplicationDbContext context,
        ILogger<LoadoutsController> logger,
        AuthService authService)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
    }

    private int? GetCurrentUserId()
    {
        var authHeader = Request.Headers["Authorization"].ToString();
        var token = !string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ")
            ? authHeader.Substring(7).Trim()
            : Request.Cookies["auth_token"];

        if (string.IsNullOrEmpty(token))
        {
            return null;
        }

        return _authService.GetUserIdFromToken(token);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LoadoutDto>>> GetLoadouts([FromQuery] int? userId)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        // Users can only see their own loadouts
        var query = _context.LoadoutFavorites
            .Include(l => l.Entries)
            .Where(l => l.UserId == currentUserId.Value);

        // If userId is provided, verify it matches the authenticated user
        if (userId.HasValue && userId.Value != currentUserId.Value)
        {
            return Forbid();
        }

        var loadouts = await query
            .OrderByDescending(l => l.UpdatedAt)
            .ToListAsync();

        return Ok(loadouts.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LoadoutDto>> GetLoadout(Guid id)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var loadout = await _context.LoadoutFavorites
            .Include(l => l.Entries)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (loadout == null)
        {
            return NotFound();
        }

        // Users can only access their own loadouts
        if (loadout.UserId != currentUserId.Value)
        {
            return Forbid();
        }

        return Ok(MapToDto(loadout));
    }

    [HttpPost]
    public async Task<ActionResult<LoadoutDto>> UpsertLoadout([FromBody] LoadoutDto request)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
            {
                _logger.LogWarning("UpsertLoadout: No authentication token provided");
                return Unauthorized(new { error = "Authentication required" });
            }

            _logger.LogInformation("UpsertLoadout: User {UserId} attempting to save loadout {LoadoutId}", 
                currentUserId.Value, request.Id);

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("UpsertLoadout: Model validation failed. Errors: {Errors}", 
                    string.Join(", ", ModelState.SelectMany(x => x.Value?.Errors ?? Enumerable.Empty<Microsoft.AspNetCore.Mvc.ModelBinding.ModelError>()).Select(e => e.ErrorMessage)));
                return ValidationProblem(ModelState);
            }

            // Ensure the userId in the request matches the authenticated user
            if (request.UserId != currentUserId.Value)
            {
                _logger.LogWarning("UpsertLoadout: User {UserId} attempted to modify loadout for user {RequestUserId}", 
                    currentUserId.Value, request.UserId);
                return Forbid(new { error = "Cannot create or modify loadouts for other users" });
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                _logger.LogWarning("UpsertLoadout: Loadout name is empty");
                return BadRequest(new { error = "Loadout name is required" });
            }

            var now = DateTime.UtcNow;
            var loadoutId = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id;
            var isNew = false;

            var loadout = await _context.LoadoutFavorites
                .Include(l => l.Entries)
                .FirstOrDefaultAsync(l => l.Id == loadoutId);

            if (loadout == null)
            {
                // Check 2-loadout limit when creating a new loadout
                var existingLoadoutCount = await _context.LoadoutFavorites
                    .CountAsync(l => l.UserId == currentUserId.Value);

                if (existingLoadoutCount >= MaxLoadoutsPerUser)
                {
                    _logger.LogWarning("UpsertLoadout: User {UserId} attempted to create more than {Max} loadouts", 
                        currentUserId.Value, MaxLoadoutsPerUser);
                    return BadRequest(new { error = $"Maximum of {MaxLoadoutsPerUser} loadouts allowed per user" });
                }

            // Parse CreatedAt from ISO string if needed
            DateTime createdAt = now;
            if (request.CreatedAt != default)
            {
                createdAt = request.CreatedAt;
            }
            else if (!string.IsNullOrEmpty(Request.Headers["X-Created-At"].ToString()))
            {
                if (DateTime.TryParse(Request.Headers["X-Created-At"].ToString(), out var parsedDate))
                {
                    createdAt = parsedDate;
                }
            }

            loadout = new LoadoutFavorite
            {
                Id = loadoutId,
                CreatedAt = createdAt
            };
                _context.LoadoutFavorites.Add(loadout);
                isNew = true;
                _logger.LogInformation("UpsertLoadout: Creating new loadout {LoadoutId} for user {UserId}", 
                    loadoutId, currentUserId.Value);
            }
            else
            {
                // Verify ownership when updating
                if (loadout.UserId != currentUserId.Value)
                {
                    _logger.LogWarning("UpsertLoadout: User {UserId} attempted to modify loadout {LoadoutId} owned by user {OwnerId}", 
                        currentUserId.Value, loadoutId, loadout.UserId);
                    return Forbid();
                }
                _logger.LogInformation("UpsertLoadout: Updating existing loadout {LoadoutId} for user {UserId}", 
                    loadoutId, currentUserId.Value);
            }

            loadout.UserId = currentUserId.Value;
            loadout.Name = request.Name.Trim();
            loadout.UpdatedAt = now;

            // Remove old entries
            _context.LoadoutFavoriteEntries.RemoveRange(loadout.Entries);
            
            // Add new entries
            if (request.Entries != null && request.Entries.Any())
            {
                _logger.LogInformation("UpsertLoadout: Adding {Count} entries to loadout {LoadoutId}", 
                    request.Entries.Count, loadoutId);
                
                foreach (var entryDto in request.Entries)
                {
                    try
                    {
                        var entry = MapToEntryEntity(entryDto, loadout.Id);
                        loadout.Entries.Add(entry);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "UpsertLoadout: Error mapping entry for loadout {LoadoutId}. Entry: {Entry}", 
                            loadoutId, System.Text.Json.JsonSerializer.Serialize(entryDto));
                        throw;
                    }
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("UpsertLoadout: Successfully saved loadout {LoadoutId} for user {UserId}", 
                loadoutId, currentUserId.Value);

            var responseDto = MapToDto(loadout);

            if (isNew)
            {
                return CreatedAtAction(nameof(GetLoadout), new { id = loadout.Id }, responseDto);
            }

            return Ok(responseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UpsertLoadout: Unexpected error saving loadout. Request: {Request}", 
                System.Text.Json.JsonSerializer.Serialize(request));
            return StatusCode(500, new { error = "An error occurred while saving the loadout", details = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteLoadout(Guid id)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        var loadout = await _context.LoadoutFavorites
            .Include(l => l.Entries)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (loadout == null)
        {
            return NotFound();
        }

        // Users can only delete their own loadouts
        if (loadout.UserId != currentUserId.Value)
        {
            return Forbid();
        }

        _context.LoadoutFavorites.Remove(loadout);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static LoadoutDto MapToDto(LoadoutFavorite loadout)
    {
        return new LoadoutDto
        {
            Id = loadout.Id,
            UserId = loadout.UserId,
            Name = loadout.Name,
            CreatedAt = loadout.CreatedAt,
            UpdatedAt = loadout.UpdatedAt,
            Entries = loadout.Entries
                .OrderBy(e => e.SlotKey)
                .ThenBy(e => e.Team)
                .Select(e => new LoadoutEntryDto
                {
                    SlotKey = e.SlotKey,
                    Team = e.Team,
                    InventoryItemId = e.InventoryItemId,
                    SkinId = e.SkinId,
                    SkinName = e.SkinName,
                    ImageUrl = e.ImageUrl,
                    Weapon = e.Weapon,
                    Type = e.Type
                })
                .ToList()
        };
    }

    private static LoadoutFavoriteEntry MapToEntryEntity(LoadoutEntryDto dto, Guid loadoutId)
    {
        // Validate required fields
        if (string.IsNullOrWhiteSpace(dto.SlotKey))
        {
            throw new ArgumentException("SlotKey is required", nameof(dto));
        }
        if (string.IsNullOrWhiteSpace(dto.Team))
        {
            throw new ArgumentException("Team is required", nameof(dto));
        }
        if (string.IsNullOrWhiteSpace(dto.SkinName))
        {
            throw new ArgumentException("SkinName is required", nameof(dto));
        }

        // Ensure string lengths don't exceed database constraints
        var slotKey = dto.SlotKey.Length > 100 ? dto.SlotKey.Substring(0, 100) : dto.SlotKey;
        var team = dto.Team.Length > 8 ? dto.Team.Substring(0, 8) : dto.Team;
        var skinName = dto.SkinName.Length > 200 ? dto.SkinName.Substring(0, 200) : dto.SkinName;
        var imageUrl = dto.ImageUrl != null && dto.ImageUrl.Length > 500 ? dto.ImageUrl.Substring(0, 500) : dto.ImageUrl;
        var weapon = dto.Weapon != null && dto.Weapon.Length > 100 ? dto.Weapon.Substring(0, 100) : dto.Weapon;
        var type = dto.Type != null && dto.Type.Length > 100 ? dto.Type.Substring(0, 100) : dto.Type;

        return new LoadoutFavoriteEntry
        {
            Id = Guid.NewGuid(),
            LoadoutFavoriteId = loadoutId,
            SlotKey = slotKey,
            Team = team,
            InventoryItemId = dto.InventoryItemId,
            SkinId = dto.SkinId,
            SkinName = skinName,
            ImageUrl = imageUrl,
            Weapon = weapon,
            Type = type
        };
    }
}





