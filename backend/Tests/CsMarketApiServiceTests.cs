using System.Net;
using System.Net.Http;
using System.Text;
using backend.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using System.Net.Http.Headers;

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
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var service = new CsMarketApiService(httpClientFactory, configuration, memoryCache, NullLogger<CsMarketApiService>.Instance);

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
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var service = new CsMarketApiService(httpClientFactory, configuration, memoryCache, NullLogger<CsMarketApiService>.Instance);

        // Act
        var prices = await service.GetBestListingPricesAsync(new[] { "  Item A  " }, delayMs: 0);

        // Assert
        Assert.True(prices.ContainsKey("Item A"));
        Assert.Null(prices["Item A"]);
    }

    [Fact]
    public async Task GetBestListingPriceAsync_RetriesOnRateLimit()
    {
        // Arrange
        var callCount = 0;
        var handler = new StubHttpMessageHandler(_ =>
        {
            callCount++;
            if (callCount == 1)
            {
                var rateLimited = new HttpResponseMessage((HttpStatusCode)429);
                rateLimited.Headers.RetryAfter = new RetryConditionHeaderValue(TimeSpan.FromMilliseconds(10));
                rateLimited.Content = new StringContent("{\"detail\":\"Quota limit reached\"}", Encoding.UTF8, "application/json");
                return rateLimited;
            }

            var json = """
            {
              "market_hash_name": "AK-47 | Redline (Field-Tested)",
              "listings": [
                {
                  "id": 1,
                  "market": "SKINPORT",
                  "min_price": 100.0,
                  "timestamp": "2025-01-01T00:00:00.000Z"
                }
              ]
            }
            """;

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        });

        var httpClientFactory = new StubHttpClientFactory(handler);
        var configuration = BuildConfiguration();
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var service = new CsMarketApiService(httpClientFactory, configuration, memoryCache, NullLogger<CsMarketApiService>.Instance);

        // Act
        var price = await service.GetBestListingPriceAsync("AK-47 | Redline (Field-Tested)");

        // Assert
        Assert.Equal(100.0m, price);
        Assert.True(service.EncounteredRateLimit);
        Assert.NotEmpty(service.RateLimitMessages);
        Assert.Equal(2, callCount);
    }

    [Fact]
    public async Task GetBestListingPriceAsync_UsesCacheOnSubsequentCalls()
    {
        // Arrange
        var callCount = 0;
        var handler = new StubHttpMessageHandler(_ =>
        {
            callCount++;
            var json = """
            {
              "market_hash_name": "AK-47 | Redline (Field-Tested)",
              "listings": [
                {
                  "id": 1,
                  "market": "SKINPORT",
                  "min_price": 95.0,
                  "timestamp": "2025-01-01T00:00:00.000Z"
                }
              ]
            }
            """;

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        });

        var httpClientFactory = new StubHttpClientFactory(handler);
        var configuration = BuildConfiguration();
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var service = new CsMarketApiService(httpClientFactory, configuration, memoryCache, NullLogger<CsMarketApiService>.Instance);

        // Act
        var first = await service.GetBestListingPriceAsync("AK-47 | Redline (Field-Tested)");
        var second = await service.GetBestListingPriceAsync("AK-47 | Redline (Field-Tested)");

        // Assert
        Assert.Equal(95.0m, first);
        Assert.Equal(95.0m, second);
        Assert.Equal(1, callCount);
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

