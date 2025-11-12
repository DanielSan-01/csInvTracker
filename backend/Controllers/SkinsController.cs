using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SkinsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SkinsController> _logger;

    public SkinsController(ApplicationDbContext context, ILogger<SkinsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/skins
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SkinDto>>> GetSkins([FromQuery] string? search = null)
    {
        try
        {
            // Fetch all skins from database
            var allSkins = await _context.Skins
                .OrderBy(s => s.Name)
                .Select(s => new SkinDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Rarity = s.Rarity,
                    Type = s.Type,
                    Collection = s.Collection,
                    Weapon = s.Weapon,
                    ImageUrl = s.ImageUrl,
                    DefaultPrice = s.DefaultPrice,
                    PaintIndex = s.PaintIndex
                })
                .ToListAsync();

            // Apply case-insensitive search in memory if search term provided
            if (!string.IsNullOrWhiteSpace(search))
            {
                _logger.LogInformation($"Searching for: '{search}' (before filtering: {allSkins.Count} skins)");
                var searchLower = search.ToLower();
                
                // Split search into words and check if ALL words appear in the name
                // This allows "butterfly doppler" to match "★ Butterfly Knife | Doppler"
                var searchWords = searchLower.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                
                allSkins = allSkins
                    .Where(s => {
                        var nameLower = s.Name.ToLower();
                        // Remove special characters for better matching
                        var nameNormalized = nameLower.Replace("★", "").Replace("|", " ").Trim();
                        
                        // Check if all search words are in the normalized name
                        return searchWords.All(word => nameNormalized.Contains(word));
                    })
                    .ToList();
                _logger.LogInformation($"After filtering: {allSkins.Count} results");
            }

            return Ok(allSkins);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching skins");
            return StatusCode(500, "An error occurred while fetching skins");
        }
    }

    // GET: api/skins/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<SkinDto>> GetSkin(int id)
    {
        try
        {
            var skin = await _context.Skins
                .Where(s => s.Id == id)
                .Select(s => new SkinDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Rarity = s.Rarity,
                    Type = s.Type,
                    Collection = s.Collection,
                    Weapon = s.Weapon,
                    ImageUrl = s.ImageUrl,
                    DefaultPrice = s.DefaultPrice,
                    PaintIndex = s.PaintIndex
                })
                .FirstOrDefaultAsync();

            if (skin == null)
            {
                return NotFound();
            }

            return Ok(skin);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching skin {SkinId}", id);
            return StatusCode(500, "An error occurred while fetching the skin");
        }
    }
}

