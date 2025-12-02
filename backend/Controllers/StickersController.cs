using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StickersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<StickersController> _logger;

    public StickersController(ApplicationDbContext context, ILogger<StickersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/stickers?search=lotus
    [HttpGet]
    public async Task<ActionResult<IEnumerable<StickerCatalogDto>>> GetStickers([FromQuery] string? search = null)
    {
        try
        {
            // Check if there are any stickers in the database
            var hasStickers = await _context.Stickers.AnyAsync();
            if (!hasStickers)
            {
                // Return empty list if no stickers exist yet
                return Ok(new List<StickerCatalogDto>());
            }

            // Get all unique stickers from inventory items
            var allStickers = await _context.Stickers
                .GroupBy(s => s.Name)
                .Select(g => new
                {
                    Name = g.Key,
                    ImageUrl = g.Where(s => s.ImageUrl != null && s.ImageUrl != string.Empty)
                        .Select(s => s.ImageUrl)
                        .FirstOrDefault(),
                    // Get average price if available
                    Prices = g.Where(s => s.Price.HasValue)
                        .Select(s => s.Price!.Value)
                        .ToList()
                })
                .ToListAsync();

            var results = allStickers
                .Select(s => new StickerCatalogDto
                {
                    Name = s.Name,
                    ImageUrl = s.ImageUrl,
                    AveragePrice = s.Prices.Any() ? (decimal?)s.Prices.Average() : null
                })
                .OrderBy(s => s.Name)
                .ToList();

            // Apply case-insensitive search if search term provided
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                var searchWords = searchLower.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                
                results = results
                    .Where(s => {
                        var nameLower = s.Name.ToLower();
                        return searchWords.All(word => nameLower.Contains(word));
                    })
                    .ToList();
            }

            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching stickers");
            return StatusCode(500, "An error occurred while fetching stickers");
        }
    }
}

