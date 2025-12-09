using System.Net;
using System.Net.Http;
using System.Text;
using backend.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests;

public class CsMarketApiServiceTests
{
    [Fact]
    public async Task GetBestListingPriceAsync_ReturnsLowestAvailablePrice()
    {
        // Arrange
        var json = """
        {
          "market_hash_name": "AK-47 | Redline (Field-Tested)",
          "listings": [
            {
              "id": 1,
              "market": "SKINPORT",
              "market_link": "https://example.com",
              "mean_price": 105.5,
              "min_price": 100.0,
              "max_price": 110.0,
              "median_price": 104.0,
              "listings": 12,
              "timestamp": "2025-01-01T00:00:00.000Z"
            },
            {
              "id": 2,
              "market": "CSDEALS",
              "market_link": "https://example.com",
              "mean_price": 97.0,
              "min_price": 95.0,
              "max_price": 105.0,
              "median_price": 98.0,
              "listings": 6,
              "timestamp": "2025-01-01T00:00:00.000Z"
            }
          ]
        }
        """;

        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });

        var httpClientFactory = new StubHttpClientFactory(handler);
        var configuration = BuildConfiguration();
        var service = new CsMarketApiService(httpClientFactory, configuration, NullLogger<CsMarketApiService>.Instance);

        // Act
        var price = await service.GetBestListingPriceAsync("AK-47 | Redline (Field-Tested)");

        // Assert
        Assert.NotNull(price);
        Assert.Equal(95.0m, price.Value);
    }

    [Fact]
    public async Task GetBestListingPricesAsync_ReturnsNull_WhenApiFails()
    {
        // Arrange
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));
        var httpClientFactory = new StubHttpClientFactory(handler);
        var configuration = BuildConfiguration();
        var service = new CsMarketApiService(httpClientFactory, configuration, NullLogger<CsMarketApiService>.Instance);

        // Act
        var prices = await service.GetBestListingPricesAsync(new[] { "  Item A  " }, delayMs: 0);

        // Assert
        Assert.True(prices.ContainsKey("Item A"));
        Assert.Null(prices["Item A"]);
    }

    private static IConfiguration BuildConfiguration()
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "CsMarket:ApiKey", "test-key" },
                { "CsMarket:Currency", "USD" },
                { "CsMarket:Markets", "SKINPORT,CSDEALS" }
            })
            .Build();
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;

        public StubHttpClientFactory(HttpMessageHandler handler)
        {
            _client = new HttpClient(handler, disposeHandler: true);
        }

        public HttpClient CreateClient(string name)
        {
            return _client;
        }
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_handler(request));
        }
    }
}

