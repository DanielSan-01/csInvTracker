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
    private const decimal SteamWalletLimit = 2000m;

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
            _logger.LogInformation("Fetching skins from database...");
            var skins = await _context.Skins
                .OrderBy(s => s.Name)
                .ToListAsync();

            _logger.LogInformation($"Retrieved {skins.Count} skins from database");

            var allSkins = new List<SkinDto>();
            foreach (var skin in skins)
            {
                try
                {
                    allSkins.Add(MapToDto(skin));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error mapping skin {SkinId} ({SkinName}) to DTO", skin.Id, skin.Name);
                    // Continue processing other skins even if one fails
                }
            }

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
            _logger.LogError(ex, "Error fetching skins: {Message}\n{StackTrace}", ex.Message, ex.StackTrace);
            return StatusCode(500, new { error = "An error occurred while fetching skins", details = ex.Message });
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
            _logger.LogError(ex, "Error fetching skin {SkinId}: {Message}\n{StackTrace}", id, ex.Message, ex.StackTrace);
            return StatusCode(500, new { error = "An error occurred while fetching the skin", details = ex.Message });
        }
    }

    private SkinDto MapToDto(backend.Models.Skin skin)
    {
        if (skin == null)
        {
            throw new ArgumentNullException(nameof(skin));
        }

        var dto = new SkinDto
        {
            Id = skin.Id,
            Name = skin.Name ?? string.Empty,
            Rarity = skin.Rarity ?? string.Empty,
            Type = skin.Type ?? string.Empty,
            Collection = skin.Collection,
            Weapon = skin.Weapon,
            ImageUrl = skin.ImageUrl,
            DefaultPrice = skin.DefaultPrice,
            PaintIndex = skin.PaintIndex,
            MarketHashName = skin.MarketHashName,
            PriceExceedsSteamLimit = skin.DefaultPrice.HasValue && skin.DefaultPrice.Value > SteamWalletLimit
        };

        try
        {
            if (_dopplerPhaseService != null)
            {
                var phaseInfo = _dopplerPhaseService.GetPhaseInfo(skin.PaintIndex);
                if (phaseInfo != null)
                {
                    dto.DopplerPhase = phaseInfo.Phase;
                    dto.DopplerPhaseImageUrl = phaseInfo.ImageUrl;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting Doppler phase info for skin {SkinId} (PaintIndex: {PaintIndex})", 
                skin.Id, skin.PaintIndex);
            // Continue without phase info rather than failing completely
        }

        return dto;
    }
}

