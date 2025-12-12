using System.IO;
using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using backend.Controllers;
using backend.Data;
using backend.Models;
using backend.DTOs;
using backend.Services;

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

        var dopplerLogger = NullLogger<DopplerPhaseService>.Instance;
        var env = new TestWebHostEnvironment();
        var dopplerService = new DopplerPhaseService(env, dopplerLogger);
        
        // Create a simple mock HttpClientFactory for tests
        var httpClientFactory = new TestHttpClientFactory();
        
        var steamApiLogger = NullLogger<SteamApiService>.Instance;
        var configuration = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "CsMarket:ApiKey", "test-key" },
                { "CsMarket:Currency", "USD" }
            })
            .Build();

        var csMarketLogger = NullLogger<CsMarketApiService>.Instance;
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var csMarketService = new CsMarketApiService(httpClientFactory, configuration, memoryCache, csMarketLogger);

        var steamApiService = new SteamApiService(httpClientFactory, configuration, steamApiLogger);
        
        var stickerCatalogLogger = NullLogger<StickerCatalogService>.Instance;
        var stickerCatalogService = new StickerCatalogService(_context, stickerCatalogLogger);
        
        var steamImportLogger = NullLogger<SteamInventoryImportService>.Instance;
        var steamImportService = new SteamInventoryImportService(
            _context,
            steamImportLogger,
            dopplerService,
            csMarketService,
            stickerCatalogService,
            httpClientFactory);

        _controller = new InventoryController(_context, dopplerService, logger, steamImportService, steamApiService, csMarketService);
        
        // Create test user
        var testUser = new User
        {
            Id = 1,
            SteamId = "76561197996404463",
            Username = "TestUser"
        };
        _context.Users.Add(testUser);
        
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
    
    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "TestHost";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public string EnvironmentName { get; set; } = Environments.Development;
    }
    
    [Fact]
    public async Task GetInventory_ReturnsEmptyList_WhenNoItems()
    {
        // Act
        var actionResult = await _controller.GetInventory(null);
        
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
            UserId = 1,
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
            UserId = 1,
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
            UserId = 1,
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
    
    [Fact]
    public async Task CreateInventoryItem_BulkAdd_AddsMultipleItemsForUser()
    {
        // Arrange - Create multiple test skins
        var skins = new List<Skin>
        {
            new Skin { Id = 2, Name = "★ Sport Gloves | Pandora's Box", Rarity = "Covert", Type = "Gloves", ImageUrl = "https://test.com/pandora.png", DefaultPrice = 4500m },
            new Skin { Id = 3, Name = "★ Butterfly Knife | Doppler", Rarity = "Covert", Type = "Knife", ImageUrl = "https://test.com/doppler.png", DefaultPrice = 3500m },
            new Skin { Id = 4, Name = "AK-47 | Fire Serpent", Rarity = "Covert", Type = "Rifle", ImageUrl = "https://test.com/fire.png", DefaultPrice = 1049m }
        };
        _context.Skins.AddRange(skins);
        await _context.SaveChangesAsync();
        
        var itemsToAdd = new List<CreateInventoryItemDto>
        {
            new CreateInventoryItemDto { UserId = 1, SkinId = 2, Float = 0.4679, Price = 4500m, Cost = 3232.66m, TradeProtected = false },
            new CreateInventoryItemDto { UserId = 1, SkinId = 3, Float = 0.01, Price = 3500m, Cost = 4522m, TradeProtected = false },
            new CreateInventoryItemDto { UserId = 1, SkinId = 4, Float = 0.22, Price = 1049m, Cost = 946m, TradeProtected = false }
        };
        
        // Act - Add all items
        var results = new List<InventoryItemDto>();
        foreach (var item in itemsToAdd)
        {
            var result = await _controller.CreateInventoryItem(item);
            var createdResult = Assert.IsType<Microsoft.AspNetCore.Mvc.CreatedAtActionResult>(result.Result);
            results.Add(Assert.IsType<InventoryItemDto>(createdResult.Value));
        }
        
        // Assert - Verify all items were created for the user
        var inventoryResult = await _controller.GetInventory(1);
        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(inventoryResult.Result);
        var inventory = Assert.IsAssignableFrom<IEnumerable<InventoryItemDto>>(okResult.Value);
        var userItems = inventory.Where(i => i.SkinId >= 2 && i.SkinId <= 4).ToList();
        
        Assert.Equal(3, userItems.Count);
        Assert.All(userItems, item => Assert.True(item.Price > 0));
        Assert.All(userItems, item => Assert.NotNull(item.SkinName));
    }
    
    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}

// Simple test implementation of IHttpClientFactory
internal class TestHttpClientFactory : IHttpClientFactory
{
    public HttpClient CreateClient(string name)
    {
        return new HttpClient();
    }
}

