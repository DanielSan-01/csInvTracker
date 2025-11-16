using System.IO;
using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using backend.Controllers;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.Tests;

public class SkinsControllerTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly SkinsController _controller;
    
    public SkinsControllerTests()
    {
        // Setup in-memory database for testing
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        _context = new ApplicationDbContext(options);
        
        var logger = LoggerFactory.Create(builder => builder.AddConsole())
            .CreateLogger<SkinsController>();

        var dopplerLogger = NullLogger<DopplerPhaseService>.Instance;
        var env = new TestWebHostEnvironment();
        var dopplerService = new DopplerPhaseService(env, dopplerLogger);

        _controller = new SkinsController(_context, dopplerService, logger);
        
        // Seed test data
        SeedTestData();
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
    
    private void SeedTestData()
    {
        var testSkins = new List<Skin>
        {
            new Skin
            {
                Id = 1,
                Name = "AK-47 | Redline",
                Rarity = "Classified",
                Type = "Rifle",
                Weapon = "AK-47",
                Collection = "The Phoenix Collection",
                ImageUrl = "https://test.com/redline.png",
                DefaultPrice = 15.0m
            },
            new Skin
            {
                Id = 2,
                Name = "AWP | Dragon Lore",
                Rarity = "Covert",
                Type = "Sniper Rifle",
                Weapon = "AWP",
                Collection = "The Cobblestone Collection",
                ImageUrl = "https://test.com/dragonlore.png",
                DefaultPrice = 5000.0m
            },
            new Skin
            {
                Id = 3,
                Name = "★ Karambit | Doppler",
                Rarity = "Covert",
                Type = "Knife",
                Weapon = "Karambit",
                Collection = "",
                ImageUrl = "https://test.com/karambit.png",
                DefaultPrice = 2000.0m
            }
        };
        
        _context.Skins.AddRange(testSkins);
        _context.SaveChanges();
    }
    
    [Fact]
    public async Task GetSkins_ReturnsAllSkins_WhenNoSearchTerm()
    {
        // Act
        var actionResult = await _controller.GetSkins(null);
        
        // Assert
        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(actionResult.Result);
        var result = Assert.IsAssignableFrom<IEnumerable<backend.DTOs.SkinDto>>(okResult.Value);
        Assert.Equal(3, result.Count());
    }
    
    [Fact]
    public async Task GetSkins_ReturnsFilteredSkins_WhenSearchTermProvided()
    {
        // Act
        var actionResult = await _controller.GetSkins("Dragon Lore");
        
        // Assert
        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(actionResult.Result);
        var result = Assert.IsAssignableFrom<IEnumerable<backend.DTOs.SkinDto>>(okResult.Value);
        Assert.Single(result);
        Assert.Equal("AWP | Dragon Lore", result.First().Name);
    }
    
    [Fact]
    public async Task GetSkins_IsCaseInsensitive()
    {
        // Act
        var actionResult = await _controller.GetSkins("karambit");
        
        // Assert
        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(actionResult.Result);
        var result = Assert.IsAssignableFrom<IEnumerable<backend.DTOs.SkinDto>>(okResult.Value);
        Assert.Single(result);
        Assert.Contains("Karambit", result.First().Name);
    }
    
    [Fact]
    public async Task GetSkins_ReturnsEmpty_WhenNoMatch()
    {
        // Act
        var actionResult = await _controller.GetSkins("NonExistentSkin");
        
        // Assert
        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(actionResult.Result);
        var result = Assert.IsAssignableFrom<IEnumerable<backend.DTOs.SkinDto>>(okResult.Value);
        Assert.Empty(result);
    }
    
    [Fact]
    public async Task GetSkin_ReturnsSkin_WhenIdExists()
    {
        // Act
        var result = await _controller.GetSkin(1);
        
        // Assert
        var okResult = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result.Result);
        var skin = Assert.IsType<backend.DTOs.SkinDto>(okResult.Value);
        Assert.Equal("AK-47 | Redline", skin.Name);
    }
    
    [Fact]
    public async Task GetSkin_ReturnsNotFound_WhenIdDoesNotExist()
    {
        // Act
        var result = await _controller.GetSkin(999);
        
        // Assert
        Assert.IsType<Microsoft.AspNetCore.Mvc.NotFoundResult>(result.Result);
    }
    
    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}

