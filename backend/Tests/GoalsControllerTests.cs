using System;
using System.Collections.Generic;
using System.Linq;
using backend.Controllers;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests;

public class GoalsControllerTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly GoalsController _controller;

    public GoalsControllerTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _controller = new GoalsController(_context, NullLogger<GoalsController>.Instance);

        _context.Users.AddRange(
            new User { Id = 1, SteamId = "user-1", Username = "User 1" },
            new User { Id = 2, SteamId = "user-2", Username = "User 2" }
        );
        _context.SaveChanges();
    }

    [Fact]
    public async Task UpsertGoal_CreatesGoalWithSelectedItems()
    {
        // Arrange
        var goalId = Guid.NewGuid();
        var dto = new GoalDto
        {
            Id = goalId,
            CreatedAt = DateTime.UtcNow,
            UserId = 1,
            SkinName = "M4A1-S | Blue Phosphor",
            SkinId = 123,
            TargetPrice = 900m,
            Balance = 250m,
            SelectedTotal = 400m,
            CoverageTotal = 650m,
            RemainingAmount = 250m,
            SurplusAmount = 0m,
            SkinRarity = "Classified",
            SkinType = "Rifle",
            SkinWeapon = "M4A1-S",
            SelectedItems = new List<GoalSelectedItemDto>
            {
                new GoalSelectedItemDto
                {
                    InventoryItemId = 42,
                    SkinName = "USP-S | Printstream",
                    Price = 150m,
                    TradeProtected = false,
                    Type = "Pistol",
                    Weapon = "USP-S"
                }
            }
        };

        // Act
        var actionResult = await _controller.UpsertGoal(dto);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        var savedGoal = Assert.IsType<GoalDto>(createdResult.Value);
        Assert.Equal(goalId, savedGoal.Id);
        Assert.Single(savedGoal.SelectedItems);

        var storedGoal = await _context.Goals.Include(g => g.SelectedItems).FirstOrDefaultAsync();
        Assert.NotNull(storedGoal);
        Assert.Single(storedGoal!.SelectedItems);
        Assert.Equal("M4A1-S | Blue Phosphor", storedGoal.SkinName);
    }

    [Fact]
    public async Task GetGoals_ReturnsItemsForSpecificUser()
    {
        // Arrange
        var goalForUser1 = new Goal
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UserId = 1,
            SkinName = "AK-47 | Fire Serpent",
            TargetPrice = 1000m,
            Balance = 200m,
            SelectedTotal = 500m,
            CoverageTotal = 700m,
            RemainingAmount = 300m,
            SurplusAmount = 0m,
            SelectedItems =
            {
                new GoalSelectedItem
                {
                    SkinName = "AK-47 | Redline",
                    Price = 250m,
                    TradeProtected = false
                }
            }
        };

        var goalForUser2 = new Goal
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UserId = 2,
            SkinName = "AWP | Dragon Lore",
            TargetPrice = 4000m,
            Balance = 1000m,
            SelectedTotal = 1500m,
            CoverageTotal = 2500m,
            RemainingAmount = 1500m,
            SurplusAmount = 0m
        };

        _context.Goals.AddRange(goalForUser1, goalForUser2);
        await _context.SaveChangesAsync();

        // Act
        var actionResult = await _controller.GetGoals(1);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var goals = Assert.IsAssignableFrom<IEnumerable<GoalDto>>(okResult.Value);
        var goalList = goals.ToList();
        Assert.Single(goalList);
        Assert.Equal("AK-47 | Fire Serpent", goalList[0].SkinName);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

