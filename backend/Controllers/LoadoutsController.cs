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
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(new { error = "Authentication required" });
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        // Ensure the userId in the request matches the authenticated user
        if (request.UserId != currentUserId.Value)
        {
            return Forbid(new { error = "Cannot create or modify loadouts for other users" });
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
                return BadRequest(new { error = $"Maximum of {MaxLoadoutsPerUser} loadouts allowed per user" });
            }

            loadout = new LoadoutFavorite
            {
                Id = loadoutId,
                CreatedAt = request.CreatedAt == default ? now : request.CreatedAt
            };
            _context.LoadoutFavorites.Add(loadout);
            isNew = true;
        }
        else
        {
            // Verify ownership when updating
            if (loadout.UserId != currentUserId.Value)
            {
                return Forbid();
            }
        }

        loadout.UserId = currentUserId.Value;
        loadout.Name = request.Name.Trim();
        loadout.UpdatedAt = now;

        _context.LoadoutFavoriteEntries.RemoveRange(loadout.Entries);
        loadout.Entries = request.Entries?
            .Select(entryDto => MapToEntryEntity(entryDto, loadout.Id))
            .ToList() ?? new List<LoadoutFavoriteEntry>();

        await _context.SaveChangesAsync();

        var responseDto = MapToDto(loadout);

        if (isNew)
        {
            return CreatedAtAction(nameof(GetLoadout), new { id = loadout.Id }, responseDto);
        }

        return Ok(responseDto);
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
        return new LoadoutFavoriteEntry
        {
            Id = Guid.NewGuid(),
            LoadoutFavoriteId = loadoutId,
            SlotKey = dto.SlotKey,
            Team = dto.Team,
            InventoryItemId = dto.InventoryItemId,
            SkinId = dto.SkinId,
            SkinName = dto.SkinName,
            ImageUrl = dto.ImageUrl,
            Weapon = dto.Weapon,
            Type = dto.Type
        };
    }
}





