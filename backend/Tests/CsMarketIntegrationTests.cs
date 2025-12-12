using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests;

public class CsMarketIntegrationTests
{
    [Fact]
    public async Task SteamInventoryImport_AssignsFloatsAndPrices_FromListingsAndSalesFallback()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var context = new ApplicationDbContext(options);

        context.Users.Add(new User { Id = 1, SteamId = "PinkPanther", Username = "PinkPanther" });
        context.Skins.AddRange(CreateSkins());
        await context.SaveChangesAsync();

        var csMarketService = CreateCsMarketService();
        var dopplerService = CreateDopplerService();
        var importService = new SteamInventoryImportService(
            context,
            NullLogger<SteamInventoryImportService>.Instance,
            dopplerService,
            csMarketService,
            stickerCatalogService: null,
            httpClientFactory: new NoopHttpClientFactory());

        var steamItems = CreateSteamItems();

        var result = await importService.ImportSteamInventoryAsync(1, steamItems);

        Assert.Equal(steamItems.Count, result.TotalItems);
        Assert.Equal(steamItems.Count, result.Imported);
        Assert.Equal(0, result.Errors);

        var storedItems = await context.InventoryItems
            .Include(i => i.Skin)
            .ToListAsync();

        Assert.Equal(steamItems.Count, storedItems.Count);

        AssertFloatAndPrice(storedItems, "AK-47 | Fire Serpent (Field-Tested)", 0.21, 721.25m);
        AssertFloatAndPrice(storedItems, "MP7 | Fade (Minimal Wear)", 0.08, 112.50m);
        AssertFloatAndPrice(storedItems, "XM1014 | Tranquility (Factory New)", 0.02, 64.10m);
        AssertFloatAndPrice(storedItems, "Desert Eagle | Printstream (Minimal Wear)", 0.11, 89.99m);

        AssertFloatAndPrice(storedItems, "★ Sport Gloves | Nocts (Battle-Scarred)", 0.92, 530.00m);
        AssertFloatAndPrice(storedItems, "★ Karambit | Tiger Tooth (Factory New)", 0.03, 1060.00m);

        AssertFloatAndPrice(storedItems, "Sticker | Dragon Lore (Foil)", 0.5, 15.25m);
        AssertFloatAndPrice(storedItems, "Recoil Case", 0.5, 0.35m);
        AssertFloatAndPrice(storedItems, "Charm | CS:GO Coin", 0.5, 0.00m);
    }

    private static void AssertFloatAndPrice(
        IEnumerable<InventoryItem> items,
        string skinName,
        double expectedFloat,
        decimal expectedPrice)
    {
        var item = items.Single(i => i.Skin!.Name == skinName);
        Assert.Equal(expectedFloat, item.Float, 3);
        Assert.Equal(expectedPrice, item.Price);
    }

    private static CsMarketApiService CreateCsMarketService()
    {
        var listingPrices = new Dictionary<string, decimal?>
        {
            ["AK-47 | Fire Serpent (Field-Tested)"] = 721.25m,
            ["MP7 | Fade (Minimal Wear)"] = 112.50m,
            ["XM1014 | Tranquility (Factory New)"] = 64.10m,
            ["Desert Eagle | Printstream (Minimal Wear)"] = 89.99m,
            ["Sticker | Dragon Lore (Foil)"] = 15.25m,
            ["Recoil Case"] = 0.35m,
            ["Charm | CS:GO Coin"] = null, // no data
            ["★ Sport Gloves | Nocts (Battle-Scarred)"] = null,
            ["★ Karambit | Tiger Tooth (Factory New)"] = null
        };

        var salesPrices = new Dictionary<string, decimal?>
        {
            ["★ Sport Gloves | Nocts (Battle-Scarred)"] = 530.00m,
            ["★ Karambit | Tiger Tooth (Factory New)"] = 1060.00m
        };

        var handler = new StubHttpMessageHandler(listingPrices, salesPrices);
        var httpClientFactory = new StubHttpClientFactory(handler);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["CsMarket:ApiKey"] = "test-key",
                ["CsMarket:Currency"] = "USD",
                ["CsMarket:MaxAgeSeconds"] = "600"
            })
            .Build();

        var memoryCache = new MemoryCache(new MemoryCacheOptions());

        return new CsMarketApiService(
            httpClientFactory,
            configuration,
            memoryCache,
            NullLogger<CsMarketApiService>.Instance);
    }

    private static DopplerPhaseService CreateDopplerService()
    {
        var env = new TestWebHostEnvironment();
        return new DopplerPhaseService(env, NullLogger<DopplerPhaseService>.Instance);
    }

    private sealed class NoopHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new HttpClient(new HttpClientHandler());
    }

    private static List<Skin> CreateSkins()
    {
        var skins = new[]
        {
            new Skin { Id = 1, Name = "AK-47 | Fire Serpent (Field-Tested)", MarketHashName = "AK-47 | Fire Serpent (Field-Tested)", Type = "Rifle", Weapon = "AK-47" },
            new Skin { Id = 2, Name = "MP7 | Fade (Minimal Wear)", MarketHashName = "MP7 | Fade (Minimal Wear)", Type = "SMG", Weapon = "MP7" },
            new Skin { Id = 3, Name = "XM1014 | Tranquility (Factory New)", MarketHashName = "XM1014 | Tranquility (Factory New)", Type = "Shotgun", Weapon = "XM1014" },
            new Skin { Id = 4, Name = "Desert Eagle | Printstream (Minimal Wear)", MarketHashName = "Desert Eagle | Printstream (Minimal Wear)", Type = "Pistol", Weapon = "Desert Eagle" },
            new Skin { Id = 5, Name = "★ Sport Gloves | Nocts (Battle-Scarred)", MarketHashName = "★ Sport Gloves | Nocts (Battle-Scarred)", Type = "Gloves" },
            new Skin { Id = 6, Name = "★ Karambit | Tiger Tooth (Factory New)", MarketHashName = "★ Karambit | Tiger Tooth (Factory New)", Type = "Knife" },
            new Skin { Id = 7, Name = "Sticker | Dragon Lore (Foil)", MarketHashName = "Sticker | Dragon Lore (Foil)", Type = "Sticker" },
            new Skin { Id = 8, Name = "Recoil Case", MarketHashName = "Recoil Case", Type = "Case" },
            new Skin { Id = 9, Name = "Charm | CS:GO Coin", MarketHashName = "Charm | CS:GO Coin", Type = "Charm" }
        };

        return skins.ToList();
    }

    private static List<SteamInventoryItemDto> CreateSteamItems()
    {
        return new List<SteamInventoryItemDto>
        {
            CreateSteamItem("asset_rifle", "AK-47 | Fire Serpent (Field-Tested)", "AK-47 | Fire Serpent (Field-Tested)", "Float: 0.21"),
            CreateSteamItem("asset_smg", "MP7 | Fade (Minimal Wear)", "MP7 | Fade (Minimal Wear)", "Float: 0.08"),
            CreateSteamItem("asset_shotgun", "XM1014 | Tranquility (Factory New)", "XM1014 | Tranquility (Factory New)", "Float: 0.02"),
            CreateSteamItem("asset_pistol", "Desert Eagle | Printstream (Minimal Wear)", "Desert Eagle | Printstream (Minimal Wear)", "Float: 0.11"),
            CreateSteamItem("asset_gloves", "★ Sport Gloves | Nocts (Battle-Scarred)", "★ Sport Gloves | Nocts (Battle-Scarred)", "Float: 0.92"),
            CreateSteamItem("asset_knife", "★ Karambit | Tiger Tooth (Factory New)", "★ Karambit | Tiger Tooth (Factory New)", "Float: 0.03"),
            CreateSteamItem("asset_sticker", "Sticker | Dragon Lore (Foil)", "Sticker | Dragon Lore (Foil)", null),
            CreateSteamItem("asset_case", "Recoil Case", "Recoil Case", null),
            CreateSteamItem("asset_charm", "Charm | CS:GO Coin", "Charm | CS:GO Coin", null)
        };
    }

    private static SteamInventoryItemDto CreateSteamItem(
        string assetId,
        string name,
        string marketHashName,
        string? floatDescriptor)
    {
        var item = new SteamInventoryItemDto
        {
            AssetId = assetId,
            Name = name,
            MarketHashName = marketHashName,
            Marketable = true,
            Tradable = true,
            Descriptions = new List<SteamDescriptionDto>(),
            Tags = new List<SteamTagDto>()
        };

        if (!string.IsNullOrWhiteSpace(floatDescriptor))
        {
            item.Descriptions!.Add(new SteamDescriptionDto
            {
                Type = "float",
                Value = floatDescriptor
            });
        }

        return item;
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
        private readonly Dictionary<string, decimal?> _listingPrices;
        private readonly Dictionary<string, decimal?> _salesPrices;

        public StubHttpMessageHandler(
            Dictionary<string, decimal?> listingPrices,
            Dictionary<string, decimal?> salesPrices)
        {
            _listingPrices = listingPrices;
            _salesPrices = salesPrices;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var query = QueryHelpers.ParseQuery(request.RequestUri!.Query);
            query.TryGetValue("market_hash_name", out var nameValues);
            var marketHashName = nameValues.FirstOrDefault() ?? string.Empty;

            if (request.RequestUri.AbsolutePath.Contains("/v1/listings/latest/aggregate"))
            {
                if (_listingPrices.TryGetValue(marketHashName, out var price) && price.HasValue)
                {
                    var payload = new
                    {
                        market_hash_name = marketHashName,
                        listings = new[]
                        {
                            new
                            {
                                id = 1234567890123,
                                market = "DMARKET",
                                market_link = $"https://example.com/{Uri.EscapeDataString(marketHashName)}",
                                mean_price = price.Value + 1.5m,
                                min_price = price.Value,
                                max_price = price.Value + 5m,
                                median_price = price.Value + 0.5m,
                                listings = 4,
                                timestamp = DateTime.UtcNow
                            }
                        }
                    };

                    return Task.FromResult(CreateJsonResponse(HttpStatusCode.OK, payload));
                }

                return Task.FromResult(CreateJsonResponse(HttpStatusCode.NotFound, new { detail = "No listings found" }));
            }

            if (request.RequestUri.AbsolutePath.Contains("/v1/sales/latest/aggregate"))
            {
                if (_salesPrices.TryGetValue(marketHashName, out var price) && price.HasValue)
                {
                    var payload = new
                    {
                        market_hash_name = marketHashName,
                        sales = new[]
                        {
                            new
                            {
                                id = 9876543210,
                                market = "DMARKET",
                                mean_price = price.Value,
                                min_price = price.Value - 10m,
                                max_price = price.Value + 10m,
                                median_price = price.Value,
                                volume = 12,
                                day = DateTime.UtcNow.Date
                            }
                        }
                    };

                    return Task.FromResult(CreateJsonResponse(HttpStatusCode.OK, payload));
                }

                return Task.FromResult(CreateJsonResponse(HttpStatusCode.NotFound, new { detail = "No sales found" }));
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        }

        private static HttpResponseMessage CreateJsonResponse(HttpStatusCode statusCode, object payload)
        {
            var json = JsonSerializer.Serialize(payload);
            return new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
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

