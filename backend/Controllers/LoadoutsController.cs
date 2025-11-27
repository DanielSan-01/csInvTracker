using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LoadoutsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LoadoutsController> _logger;

    public LoadoutsController(ApplicationDbContext context, ILogger<LoadoutsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LoadoutDto>>> GetLoadouts([FromQuery] int? userId)
    {
        var query = _context.LoadoutFavorites
            .Include(l => l.Entries)
            .AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(l => l.UserId == userId.Value);
        }

        var loadouts = await query
            .OrderByDescending(l => l.UpdatedAt)
            .ToListAsync();

        return Ok(loadouts.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LoadoutDto>> GetLoadout(Guid id)
    {
        var loadout = await _context.LoadoutFavorites
            .Include(l => l.Entries)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (loadout == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(loadout));
    }

    [HttpPost]
    public async Task<ActionResult<LoadoutDto>> UpsertLoadout([FromBody] LoadoutDto request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var now = DateTime.UtcNow;
        var loadoutId = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id;
        var isNew = false;

        var loadout = await _context.LoadoutFavorites
            .Include(l => l.Entries)
            .FirstOrDefaultAsync(l => l.Id == loadoutId);

        if (loadout == null)
        {
            loadout = new LoadoutFavorite
            {
                Id = loadoutId,
                CreatedAt = request.CreatedAt == default ? now : request.CreatedAt
            };
            _context.LoadoutFavorites.Add(loadout);
            isNew = true;
        }
        else if (loadout.UserId != request.UserId)
        {
            return Forbid();
        }

        loadout.UserId = request.UserId;
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
        var loadout = await _context.LoadoutFavorites
            .Include(l => l.Entries)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (loadout == null)
        {
            return NotFound();
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





