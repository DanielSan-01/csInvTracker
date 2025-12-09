using backend.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace backend.Tests;

public class SteamApiServiceTests
{
    private readonly SteamApiService _steamApiService;

    public SteamApiServiceTests()
    {
        var services = new ServiceCollection();

        services.AddLogging(builder => builder.AddDebug().AddConsole());
        services.AddHttpClient();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Steam:ApiKey", Environment.GetEnvironmentVariable("STEAM_API_KEY") }
            })
            .Build();

        services.AddSingleton<IConfiguration>(configuration);
        services.AddTransient<SteamApiService>();

        var serviceProvider = services.BuildServiceProvider();
        _steamApiService = serviceProvider.GetRequiredService<SteamApiService>();
    }

    [Fact]
    public async Task GetMarketPriceAsync_ReturnsPrice_ForKnownMarketHashName()
    {
        var runTests = Environment.GetEnvironmentVariable("RUN_STEAM_TESTS");
        if (!string.Equals(runTests, "1", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        const string knownMarketHash = "AK-47 | Redline (Field-Tested)";

        var price = await _steamApiService.GetMarketPriceAsync(knownMarketHash);

        Assert.True(price.HasValue, "Expected a price value from Steam Market API.");
        Assert.True(price.Value > 0, "Expected market price to be greater than zero.");
    }

    [Fact]
    public async Task GetMarketDataAsync_ReturnsDetailedData_ForKnownMarketHashName()
    {
        var runTests = Environment.GetEnvironmentVariable("RUN_STEAM_TESTS");
        if (!string.Equals(runTests, "1", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        const string knownMarketHash = "AK-47 | Redline (Field-Tested)";

        var data = await _steamApiService.GetMarketDataAsync(knownMarketHash);

        Assert.NotNull(data);
        Assert.True(data!.LowestPrice.HasValue && data.LowestPrice.Value > 0, "Expected a lowest price from Steam Market API.");
        Assert.False(string.IsNullOrWhiteSpace(data.RawLowestPrice), "Expected raw lowest price string to be populated.");
    }
}