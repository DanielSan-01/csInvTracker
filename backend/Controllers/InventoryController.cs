using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.DTOs;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(ApplicationDbContext context, ILogger<InventoryController> logger)
    {
        _context = context;
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

    // GET: api/inventory
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetInventory()
    {
        try
        {
            var items = await _context.InventoryItems
                .Include(i => i.Skin)
                .OrderByDescending(i => i.AcquiredAt)
                .Select(i => new InventoryItemDto
                {
                    Id = i.Id,
                    SkinId = i.SkinId,
                    SkinName = i.Skin.Name,
                    Rarity = i.Skin.Rarity,
                    Type = i.Skin.Type,
                    Float = i.Float,
                    Exterior = i.Exterior,
                    PaintSeed = i.PaintSeed,
                    Price = i.Price,
                    Cost = i.Cost,
                    ImageUrl = i.ImageUrl ?? i.Skin.ImageUrl,
                    TradeProtected = i.TradeProtected,
                    TradableAfter = i.TradableAfter,
                    AcquiredAt = i.AcquiredAt
                })
                .ToListAsync();

            return Ok(items);
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
                .Where(i => i.Id == id)
                .Select(i => new InventoryItemDto
                {
                    Id = i.Id,
                    SkinId = i.SkinId,
                    SkinName = i.Skin.Name,
                    Rarity = i.Skin.Rarity,
                    Type = i.Skin.Type,
                    Float = i.Float,
                    Exterior = i.Exterior,
                    PaintSeed = i.PaintSeed,
                    Price = i.Price,
                    Cost = i.Cost,
                    ImageUrl = i.ImageUrl ?? i.Skin.ImageUrl,
                    TradeProtected = i.TradeProtected,
                    TradableAfter = i.TradableAfter,
                    AcquiredAt = i.AcquiredAt
                })
                .FirstOrDefaultAsync();

            if (item == null)
            {
                return NotFound();
            }

            return Ok(item);
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
            // Verify skin exists
            var skin = await _context.Skins.FindAsync(dto.SkinId);
            if (skin == null)
            {
                return BadRequest("Invalid skin ID");
            }

            var item = new InventoryItem
            {
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
                .Where(i => i.Id == item.Id)
                .Select(i => new InventoryItemDto
                {
                    Id = i.Id,
                    SkinId = i.SkinId,
                    SkinName = i.Skin.Name,
                    Rarity = i.Skin.Rarity,
                    Type = i.Skin.Type,
                    Float = i.Float,
                    Exterior = i.Exterior,
                    PaintSeed = i.PaintSeed,
                    Price = i.Price,
                    Cost = i.Cost,
                    ImageUrl = i.ImageUrl ?? i.Skin.ImageUrl,
                    TradeProtected = i.TradeProtected,
                    TradableAfter = i.TradableAfter,
                    AcquiredAt = i.AcquiredAt
                })
                .FirstAsync();

            return CreatedAtAction(nameof(GetInventoryItem), new { id = item.Id }, createdItem);
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
                .Where(i => i.Id == id)
                .Select(i => new InventoryItemDto
                {
                    Id = i.Id,
                    SkinId = i.SkinId,
                    SkinName = i.Skin.Name,
                    Rarity = i.Skin.Rarity,
                    Type = i.Skin.Type,
                    Float = i.Float,
                    Exterior = i.Exterior,
                    PaintSeed = i.PaintSeed,
                    Price = i.Price,
                    Cost = i.Cost,
                    ImageUrl = i.ImageUrl ?? i.Skin.ImageUrl,
                    TradeProtected = i.TradeProtected,
                    TradableAfter = i.TradableAfter,
                    AcquiredAt = i.AcquiredAt
                })
                .FirstAsync();

            return Ok(updatedItem);
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
}

