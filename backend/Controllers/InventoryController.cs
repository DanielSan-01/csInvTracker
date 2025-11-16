using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
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

    public InventoryController(ApplicationDbContext context, DopplerPhaseService dopplerPhaseService, ILogger<InventoryController> logger)
    {
        _context = context;
        _dopplerPhaseService = dopplerPhaseService;
        _logger = logger;
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

    // GET: api/inventory?userId={userId}
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetInventory([FromQuery] int? userId)
    {
        try
        {
            var query = _context.InventoryItems
                .Include(i => i.Skin)
                .AsQueryable();

            // Filter by user if userId provided
            if (userId.HasValue)
            {
                query = query.Where(i => i.UserId == userId.Value);
            }
            
            var items = await query.ToListAsync();
            var dtoItems = items.Select(MapToDto).ToList();

            return Ok(dtoItems);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory");
            return StatusCode(500, "An error occurred while fetching inventory");
        }
    }

    // GET: api/inventory/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<InventoryItemDto>> GetInventoryItem(int id)
    {
        try
        {
            var item = await _context.InventoryItems
                .Include(i => i.Skin)
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

            _context.InventoryItems.Add(item);
            await _context.SaveChangesAsync();

            // Fetch the complete item with skin data
            var createdItem = await _context.InventoryItems
                .Include(i => i.Skin)
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
            var item = await _context.InventoryItems.FindAsync(id);
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

            await _context.SaveChangesAsync();

            // Fetch the updated item with skin data
            var updatedItem = await _context.InventoryItems
                .Include(i => i.Skin)
                .FirstAsync(i => i.Id == id);

            return Ok(MapToDto(updatedItem));
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
        var dto = new InventoryItemDto
        {
            Id = item.Id,
            SkinId = item.SkinId,
            SkinName = item.Skin.Name,
            Rarity = item.Skin.Rarity,
            Type = item.Skin.Type,
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

        return dto;
    }
}

