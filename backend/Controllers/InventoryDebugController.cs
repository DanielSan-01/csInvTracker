using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryDebugController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public InventoryDebugController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/inventorydebug/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetInventoryItemWithStickers(int id)
    {
        try
        {
            var item = await _context.InventoryItems
                .Include(i => i.Skin)
                .Include(i => i.Stickers)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
            {
                return NotFound(new { error = $"Inventory item with ID {id} not found" });
            }

            return Ok(new
            {
                id = item.Id,
                skinId = item.SkinId,
                skinName = item.Skin?.Name ?? "Unknown",
                @float = item.Float,
                exterior = item.Exterior,
                price = item.Price,
                cost = item.Cost,
                stickers = item.Stickers.Select(s => new
                {
                    id = s.Id,
                    name = s.Name,
                    price = s.Price,
                    slot = s.Slot,
                    imageUrl = s.ImageUrl,
                    inventoryItemId = s.InventoryItemId
                }).ToList(),
                stickerCount = item.Stickers.Count
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    // GET: api/inventorydebug/all
    [HttpGet("all")]
    public async Task<ActionResult<object>> GetAllInventoryItemsWithStickers()
    {
        try
        {
            var items = await _context.InventoryItems
                .Include(i => i.Skin)
                .Include(i => i.Stickers)
                .OrderByDescending(i => i.Id)
                .Take(20)
                .Select(i => new
                {
                    id = i.Id,
                    skinId = i.SkinId,
                    skinName = i.Skin != null ? i.Skin.Name : "Unknown",
                    @float = i.Float,
                    price = i.Price,
                    stickerCount = i.Stickers.Count,
                    stickers = i.Stickers.Select(s => new
                    {
                        id = s.Id,
                        name = s.Name,
                        price = s.Price,
                        slot = s.Slot,
                        imageUrl = s.ImageUrl
                    }).ToList()
                })
                .ToListAsync();

            return Ok(new
            {
                totalItems = items.Count,
                items = items
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }
}

