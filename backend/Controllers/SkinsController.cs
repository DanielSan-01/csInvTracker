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
            var query = _context.Skins.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(s => s.Name.Contains(search));
            }

            var skins = await query
                .OrderBy(s => s.Name)
                .Select(s => new SkinDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    Rarity = s.Rarity,
                    Type = s.Type,
                    ImageUrl = s.ImageUrl,
                    DefaultPrice = s.DefaultPrice
                })
                .ToListAsync();

            return Ok(skins);
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
                    ImageUrl = s.ImageUrl,
                    DefaultPrice = s.DefaultPrice
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

