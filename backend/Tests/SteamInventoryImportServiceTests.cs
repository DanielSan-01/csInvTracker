using System.Net;
using System.Text.Json;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests;

public class SteamInventoryImportServiceTests
{
    [Fact]
    public async Task ImportSteamInventoryAsync_ParsesFloatFromHtmlAndOverridesExterior()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var context = new ApplicationDbContext(options);
        context.Users.Add(new User { Id = 1, Username = "TestUser" });
        context.Skins.Add(new Skin
        {
            Id = 1,
            Name = "AK-47 | Redline (Field-Tested)",
            MarketHashName = "AK-47 | Redline (Field-Tested)",
            Type = "Rifle",
            Weapon = "AK-47"
        });
        await context.SaveChangesAsync();

        var csMarketService = CreateCsMarketService();
        var dopplerService = new DopplerPhaseService(new TestWebHostEnvironment(), NullLogger<DopplerPhaseService>.Instance);

        var importService = new SteamInventoryImportService(
            context,
            NullLogger<SteamInventoryImportService>.Instance,
            dopplerService,
            csMarketService);

        var steamItem = new SteamInventoryItemDto
        {
            AssetId = "asset_html_float",
            MarketHashName = "AK-47 | Redline (Field-Tested)",
            Name = "AK-47 | Redline (Field-Tested)",
            Marketable = true,
            Tradable = true,
            Descriptions = new List<SteamDescriptionDto>
            {
                new()
                {
                    Type = "html",
                    Value = "Float Value: <span style='color:#FF0'>0.123456</span>"
                }
            },
            Tags = new List<SteamTagDto>
            {
                new()
                {
                    Category = "Exterior",
                    LocalizedTagName = "Minimal Wear"
                }
            }
        };

        await importService.ImportSteamInventoryAsync(
            1,
            new List<SteamInventoryItemDto> { steamItem });

        var storedItem = await context.InventoryItems
            .Include(i => i.Skin)
            .SingleAsync(i => i.AssetId == "asset_html_float");

        Assert.Equal(0.123456, storedItem.Float, 6);
        Assert.Equal("Minimal Wear", storedItem.Exterior);
    }

    [Fact]
    public async Task ImportSteamInventoryAsync_WhenSkippingPrices_DoesNotOverwriteExistingPrice()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var context = new ApplicationDbContext(options);
        context.Users.Add(new User { Id = 1, Username = "TestUser" });

        var skin = new Skin
        {
            Id = 1,
            Name = "AWP | Asiimov (Field-Tested)",
            MarketHashName = "AWP | Asiimov (Field-Tested)",
            Type = "Rifle",
            Weapon = "AWP"
        };
        context.Skins.Add(skin);

        context.InventoryItems.Add(new InventoryItem
        {
            Id = 10,
            UserId = 1,
            SkinId = 1,
            AssetId = "asset_existing",
            Float = 0.5,
            Exterior = "Field-Tested",
            Price = 250.00m,
            TradeProtected = false,
            SteamMarketHashName = skin.MarketHashName
        });
        await context.SaveChangesAsync();

        var csMarketService = CreateCsMarketService();
        var dopplerService = new DopplerPhaseService(new TestWebHostEnvironment(), NullLogger<DopplerPhaseService>.Instance);

        var importService = new SteamInventoryImportService(
            context,
            NullLogger<SteamInventoryImportService>.Instance,
            dopplerService,
            csMarketService);

        var steamItem = new SteamInventoryItemDto
        {
            AssetId = "asset_existing",
            MarketHashName = "AWP | Asiimov (Field-Tested)",
            Name = "AWP | Asiimov (Field-Tested)",
            Marketable = true,
            Tradable = true,
            Descriptions = new List<SteamDescriptionDto>
            {
                new()
                {
                    Type = "html",
                    Value = "Float Value: <span>0.1234</span>"
                }
            }
        };

        await importService.ImportSteamInventoryAsync(
            1,
            new List<SteamInventoryItemDto> { steamItem },
            fetchMarketPrices: false);

        var updatedItem = await context.InventoryItems.SingleAsync(i => i.AssetId == "asset_existing");

        Assert.Equal(0.1234, updatedItem.Float, 4);
        Assert.Equal("Minimal Wear", updatedItem.Exterior);
        Assert.Equal(250.00m, updatedItem.Price);
    }

    private static CsMarketApiService CreateCsMarketService()
    {
        var handler = new StubHttpMessageHandler();
        var httpClientFactory = new StubHttpClientFactory(handler);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["CsMarket:ApiKey"] = "test-key",
                ["CsMarket:Currency"] = "USD"
            })
            .Build();

        var memoryCache = new MemoryCache(new MemoryCacheOptions());

        return new CsMarketApiService(
            httpClientFactory,
            configuration,
            memoryCache,
            NullLogger<CsMarketApiService>.Instance);
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public StubHttpClientFactory(HttpMessageHandler handler)
        {
            _handler = handler;
        }

        public HttpClient CreateClient(string name)
        {
            return new HttpClient(_handler, disposeHandler: false);
        }
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            // Always return 404 so prices remain untouched in tests.
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent(JsonSerializer.Serialize(new { detail = "No listings found" }))
            });
        }
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "TestHost";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public string EnvironmentName { get; set; } = "Development";
    }
}


