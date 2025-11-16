using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SkinsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SkinsController> _logger;
    private readonly DopplerPhaseService _dopplerPhaseService;

    public SkinsController(ApplicationDbContext context, DopplerPhaseService dopplerPhaseService, ILogger<SkinsController> logger)
    {
        _context = context;
        _dopplerPhaseService = dopplerPhaseService;
        _logger = logger;
    }

    // GET: api/skins
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SkinDto>>> GetSkins([FromQuery] string? search = null)
    {
        try
        {
            var skins = await _context.Skins
                .OrderBy(s => s.Name)
                .ToListAsync();

            var allSkins = skins
                .Select(MapToDto)
                .ToList();

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
            var skinEntity = await _context.Skins
                .FirstOrDefaultAsync(s => s.Id == id);

            if (skinEntity == null)
            {
                return NotFound();
            }

            return Ok(MapToDto(skinEntity));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching skin {SkinId}", id);
            return StatusCode(500, "An error occurred while fetching the skin");
        }
    }

    private SkinDto MapToDto(backend.Models.Skin skin)
    {
        var dto = new SkinDto
        {
            Id = skin.Id,
            Name = skin.Name,
            Rarity = skin.Rarity,
            Type = skin.Type,
            Collection = skin.Collection,
            Weapon = skin.Weapon,
            ImageUrl = skin.ImageUrl,
            DefaultPrice = skin.DefaultPrice,
            PaintIndex = skin.PaintIndex
        };

        var phaseInfo = _dopplerPhaseService.GetPhaseInfo(skin.PaintIndex);
        if (phaseInfo != null)
        {
            dto.DopplerPhase = phaseInfo.Phase;
            dto.DopplerPhaseImageUrl = phaseInfo.ImageUrl;
        }

        return dto;
    }
}

