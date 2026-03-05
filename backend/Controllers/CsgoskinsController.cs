using Microsoft.AspNetCore.Mvc;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CsgoskinsController : ControllerBase
{
    private readonly CsgoskinsScraperService _scraperService;
    private readonly ILogger<CsgoskinsController> _logger;

    public CsgoskinsController(
        CsgoskinsScraperService scraperService,
        ILogger<CsgoskinsController> logger)
    {
        _scraperService = scraperService;
        _logger = logger;
    }

    /// <summary>
    /// Scrapes price data from csgoskins.gg for a given skin
    /// GET /api/csgoskins/price?skinSlug=m9-bayonet-ultraviolet&exteriorSlug=field-tested
    /// </summary>
    [HttpGet("price")]
    public async Task<ActionResult<CsgoskinsPriceData>> GetPrice(
        [FromQuery] string skinSlug,
        [FromQuery] string? exteriorSlug = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(skinSlug))
            {
                return BadRequest(new { error = "skinSlug is required" });
            }

            var priceData = await _scraperService.GetPriceAsync(skinSlug, exteriorSlug, cancellationToken);

            if (priceData is null)
            {
                return NotFound(new { error = "Price data not found for the specified skin" });
            }

            return Ok(priceData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching price from csgoskins.gg for {SkinSlug}", skinSlug);
            return StatusCode(500, new { error = "An error occurred while fetching price data" });
        }
    }
}

