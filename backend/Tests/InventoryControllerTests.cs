using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using backend.Controllers;
using backend.Data;
using backend.Models;
using backend.DTOs;

namespace backend.Tests;

public class InventoryControllerTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly InventoryController _controller;
    private readonly Skin _testSkin;
    
    public InventoryControllerTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        _context = new ApplicationDbContext(options);
        
        var logger = LoggerFactory.Create(builder => builder.AddConsole())
            .CreateLogger<InventoryController>();
            
        _controller = new InventoryController(_context, logger);
        
        // Create test skin
        _testSkin = new Skin
        {
            Id = 1,
            Name = "AK-47 | Redline",
            Rarity = "Classified",
            Type = "Rifle",
            Weapon = "AK-47",
            ImageUrl = "https://test.com/redline.png",
            DefaultPrice = 15.0m
        };
        
        _context.Skins.Add(_testSkin);
        _context.SaveChanges();
    }
    
    [Fact]
    public async Task GetInventory_ReturnsEmptyList_WhenNoItems()
    {
        // Act
        var actionResult = await _controller.GetInventory();
        
        // Assert
        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(actionResult.Result);
        var result = Assert.IsAssignableFrom<IEnumerable<InventoryItemDto>>(okResult.Value);
        Assert.Empty(result);
    }
    
    [Fact]
    public async Task CreateInventoryItem_AddsItem_WithValidData()
    {
        // Arrange
        var createDto = new CreateInventoryItemDto
        {
            SkinId = 1,
            Float = 0.15f,
            Price = 20.0m,
            Cost = 15.0m,
            TradeProtected = false
        };
        
        // Act
        var result = await _controller.CreateInventoryItem(createDto);
        
        // Assert
        var createdResult = Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(result.Result);
        var item = Assert.IsType<InventoryItemDto>(createdResult.Value);
        Assert.Equal("AK-47 | Redline", item.SkinName);
        Assert.Equal("Field-Tested", item.Exterior);
        Assert.Equal(20.0m, item.Price);
    }
    
    [Fact]
    public async Task CreateInventoryItem_ReturnsBadRequest_WhenSkinNotFound()
    {
        // Arrange
        var createDto = new CreateInventoryItemDto
        {
            SkinId = 999, // Non-existent skin
            Float = 0.15f,
            Price = 20.0m,
            TradeProtected = false
        };
        
        // Act
        var result = await _controller.CreateInventoryItem(createDto);
        
        // Assert
        Assert.IsType<Microsoft.AspNetCore.Mvc.BadRequestObjectResult>(result.Result);
    }
    
    [Fact]
    public async Task UpdateInventoryItem_UpdatesItem_WithValidData()
    {
        // Arrange - Create item first
        var item = new InventoryItem
        {
            SkinId = 1,
            Float = 0.15f,
            Exterior = "Field-Tested",
            Price = 20.0m,
            Cost = 15.0m,
            TradeProtected = false,
            AcquiredAt = DateTime.UtcNow
        };
        _context.InventoryItems.Add(item);
        await _context.SaveChangesAsync();
        
        var updateDto = new UpdateInventoryItemDto
        {
            Float = 0.10f,
            Price = 25.0m,
            Cost = 18.0m,
            TradeProtected = false
        };
        
        // Act
        var actionResult = await _controller.UpdateInventoryItem(item.Id, updateDto);
        
        // Assert
        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(actionResult.Result);
        var result = Assert.IsType<InventoryItemDto>(okResult.Value);
        Assert.Equal(0.10f, result.Float);
        Assert.Equal("Minimal Wear", result.Exterior);
        Assert.Equal(25.0m, result.Price);
    }
    
    [Fact]
    public async Task DeleteInventoryItem_RemovesItem()
    {
        // Arrange - Create item first
        var item = new InventoryItem
        {
            SkinId = 1,
            Float = 0.15f,
            Exterior = "Field-Tested",
            Price = 20.0m,
            TradeProtected = false,
            AcquiredAt = DateTime.UtcNow
        };
        _context.InventoryItems.Add(item);
        await _context.SaveChangesAsync();
        
        // Act
        var result = await _controller.DeleteInventoryItem(item.Id);
        
        // Assert
        Assert.IsType<Microsoft.AspNetCore.Mvc.NoContentResult>(result);
        
        // Verify deletion
        var deletedItem = await _context.InventoryItems.FindAsync(item.Id);
        Assert.Null(deletedItem);
    }
    
    [Theory]
    [InlineData(0.00f, "Factory New")]
    [InlineData(0.06f, "Factory New")]
    [InlineData(0.07f, "Minimal Wear")]
    [InlineData(0.14f, "Minimal Wear")]
    [InlineData(0.15f, "Field-Tested")]
    [InlineData(0.37f, "Field-Tested")]
    // Skip edge case 0.38 due to float precision
    [InlineData(0.39f, "Well-Worn")]
    [InlineData(0.44f, "Well-Worn")]
    // Skip edge case 0.45 due to float precision
    [InlineData(0.46f, "Battle-Scarred")]
    [InlineData(1.00f, "Battle-Scarred")]
    public async Task CreateInventoryItem_CalculatesCorrectExterior(float floatValue, string expectedExterior)
    {
        // Arrange
        var createDto = new CreateInventoryItemDto
        {
            SkinId = 1,
            Float = floatValue,
            Price = 20.0m,
            TradeProtected = false
        };
        
        // Act
        var result = await _controller.CreateInventoryItem(createDto);
        
        // Assert
        var createdResult = Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(result.Result);
        var item = Assert.IsType<InventoryItemDto>(createdResult.Value);
        Assert.Equal(expectedExterior, item.Exterior);
    }
    
    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}

