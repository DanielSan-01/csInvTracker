using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GoalsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GoalsController> _logger;

    public GoalsController(ApplicationDbContext context, ILogger<GoalsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GoalDto>>> GetGoals([FromQuery] int? userId)
    {
        var query = _context.Goals
            .Include(g => g.SelectedItems)
            .AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(g => g.UserId == userId.Value);
        }

        var goals = await query
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        return Ok(goals.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GoalDto>> GetGoal(Guid id)
    {
        var goal = await _context.Goals
            .Include(g => g.SelectedItems)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (goal == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(goal));
    }

    [HttpPost]
    public async Task<ActionResult<GoalDto>> UpsertGoal([FromBody] GoalDto request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var now = DateTime.UtcNow;
        var goalId = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id;
        var isNew = false;

        var goal = await _context.Goals
            .Include(g => g.SelectedItems)
            .FirstOrDefaultAsync(g => g.Id == goalId);

        if (goal == null)
        {
            goal = new Goal { Id = goalId, CreatedAt = request.CreatedAt == default ? now : request.CreatedAt };
            _context.Goals.Add(goal);
            isNew = true;
        }

        goal.UpdatedAt = now;
        UpdateGoalFromDto(goal, request);

        // replace selected items
        _context.GoalSelectedItems.RemoveRange(goal.SelectedItems);
        goal.SelectedItems = request.SelectedItems?
            .Select(itemDto => MapToSelectedItemEntity(itemDto, goal.Id))
            .ToList() ?? new List<GoalSelectedItem>();

        await _context.SaveChangesAsync();

        var responseDto = MapToDto(goal);

        if (isNew)
        {
            return CreatedAtAction(nameof(GetGoal), new { id = goal.Id }, responseDto);
        }

        return Ok(responseDto);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteGoal(Guid id)
    {
        var goal = await _context.Goals
            .Include(g => g.SelectedItems)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (goal == null)
        {
            return NotFound();
        }

        _context.Goals.Remove(goal);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static GoalDto MapToDto(Goal goal)
    {
        return new GoalDto
        {
            Id = goal.Id,
            CreatedAt = goal.CreatedAt,
            UpdatedAt = goal.UpdatedAt,
            UserId = goal.UserId,
            SkinName = goal.SkinName,
            SkinId = goal.SkinId,
            TargetPrice = goal.TargetPrice,
            Balance = goal.Balance,
            SelectedTotal = goal.SelectedTotal,
            CoverageTotal = goal.CoverageTotal,
            RemainingAmount = goal.RemainingAmount,
            SurplusAmount = goal.SurplusAmount,
            SkinImageUrl = goal.SkinImageUrl,
            SkinAltImageUrl = goal.SkinAltImageUrl,
            SkinRarity = goal.SkinRarity,
            SkinType = goal.SkinType,
            SkinWeapon = goal.SkinWeapon,
            SelectedItems = goal.SelectedItems
                .OrderBy(si => si.Id)
                .Select(si => new GoalSelectedItemDto
                {
                    InventoryItemId = si.SourceInventoryItemId,
                    SkinName = si.SkinName,
                    Price = si.Price,
                    TradeProtected = si.TradeProtected,
                    ImageUrl = si.ImageUrl,
                    Weapon = si.Weapon,
                    Type = si.Type
                })
                .ToList()
        };
    }

    private static GoalSelectedItem MapToSelectedItemEntity(GoalSelectedItemDto dto, Guid goalId)
    {
        return new GoalSelectedItem
        {
            GoalId = goalId,
            SourceInventoryItemId = dto.InventoryItemId,
            SkinName = dto.SkinName,
            Price = dto.Price,
            TradeProtected = dto.TradeProtected,
            ImageUrl = dto.ImageUrl,
            Weapon = dto.Weapon,
            Type = dto.Type
        };
    }

    private static void UpdateGoalFromDto(Goal goal, GoalDto dto)
    {
        goal.UserId = dto.UserId;
        goal.SkinName = dto.SkinName;
        goal.SkinId = dto.SkinId;
        goal.TargetPrice = dto.TargetPrice;
        goal.Balance = dto.Balance;
        goal.SelectedTotal = dto.SelectedTotal;
        goal.CoverageTotal = dto.CoverageTotal;
        goal.RemainingAmount = dto.RemainingAmount;
        goal.SurplusAmount = dto.SurplusAmount;
        goal.SkinImageUrl = dto.SkinImageUrl;
        goal.SkinAltImageUrl = dto.SkinAltImageUrl;
        goal.SkinRarity = dto.SkinRarity;
        goal.SkinType = dto.SkinType;
        goal.SkinWeapon = dto.SkinWeapon;
        if (dto.CreatedAt != default && goal.CreatedAt == default)
        {
            goal.CreatedAt = dto.CreatedAt;
        }
    }
}


