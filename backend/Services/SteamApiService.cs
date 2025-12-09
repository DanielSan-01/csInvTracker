using System.Globalization;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace backend.Services;

public class SteamApiService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SteamApiService> _logger;
    private readonly string _apiKey;

    public SteamApiService(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<SteamApiService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _apiKey = configuration["Steam:ApiKey"] ?? Environment.GetEnvironmentVariable("STEAM_API_KEY") ?? string.Empty;
        
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Steam API key is not configured. Steam profile fetching will not work.");
        }
    }

    public class SteamPlayerSummary
    {
        public string SteamId { get; set; } = string.Empty;
        public string PersonaName { get; set; } = string.Empty;
        public string ProfileUrl { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
        public string AvatarMedium { get; set; } = string.Empty;
        public string AvatarFull { get; set; } = string.Empty;
        public int PersonaState { get; set; }
        public int CommunityVisibilityState { get; set; }
        public int ProfileState { get; set; }
        public long LastLogoff { get; set; }
        public int CommentPermission { get; set; }
    }

    public class GetPlayerSummariesResponse
    {
        public GetPlayerSummariesResult? Response { get; set; }
    }

    public class GetPlayerSummariesResult
    {
        public List<SteamPlayerSummary>? Players { get; set; }
    }

    /// <summary>
    /// Fetches player summary from Steam Web API using GetPlayerSummaries
    /// </summary>
    public async Task<SteamPlayerSummary?> GetPlayerSummaryAsync(string steamId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Cannot fetch Steam profile: API key not configured");
            return null;
        }

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            var url = $"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={_apiKey}&steamids={steamId}&format=json";
            
            _logger.LogInformation("Fetching Steam profile for Steam ID: {SteamId}", steamId);
            
            var response = await httpClient.GetAsync(url, cancellationToken);
            response.EnsureSuccessStatusCode();
            
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<GetPlayerSummariesResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result?.Response?.Players == null || result.Response.Players.Count == 0)
            {
                _logger.LogWarning("No player data returned for Steam ID: {SteamId}", steamId);
                return null;
            }

            return result.Response.Players[0];
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Steam profile for Steam ID: {SteamId}", steamId);
            return null;
        }
    }

    /// <summary>
    /// Fetches market price for a CS:GO/CS2 item from Steam Market
    /// Uses public Steam Market API (no authentication required)
    /// </summary>
    public async Task<decimal?> GetMarketPriceAsync(string marketHashName, int appId = 730, CancellationToken cancellationToken = default)
    {
        var data = await GetMarketDataAsync(marketHashName, appId, cancellationToken);
        return data?.LowestPrice;
    }

    /// <summary>
    /// Fetches market prices for multiple items with rate limiting
    /// Adds delays between requests to avoid rate limiting
    /// </summary>
    public async Task<Dictionary<string, decimal?>> GetMarketPricesAsync(
        IEnumerable<string> marketHashNames, 
        int appId = 730,
        int delayMs = 200, // Delay between requests to avoid rate limiting
        CancellationToken cancellationToken = default)
    {
        var results = new Dictionary<string, decimal?>();
        
        foreach (var marketHashName in marketHashNames)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            var data = await GetMarketDataAsync(marketHashName, appId, cancellationToken);
            results[marketHashName] = data?.LowestPrice;

            // Add delay between requests to avoid rate limiting (except for last item)
            if (delayMs > 0)
            {
                await Task.Delay(delayMs, cancellationToken);
            }
        }

        return results;
    }

    public class SteamMarketPriceResponse
    {
        public bool Success { get; set; }
        public string? LowestPrice { get; set; }
        public string? Volume { get; set; }
        public string? MedianPrice { get; set; }
    }

    public class SteamMarketData
    {
        public decimal? LowestPrice { get; init; }
        public decimal? MedianPrice { get; init; }
        public int? Volume { get; init; }
        public string? RawLowestPrice { get; init; }
        public string? RawMedianPrice { get; init; }
        public string? CurrencyCode { get; init; }
    }

    private static decimal? ParsePriceString(string? priceString, out string? currencyCode)
    {
        currencyCode = null;

        if (string.IsNullOrWhiteSpace(priceString))
        {
            return null;
        }

        var trimmed = priceString.Trim();

        try
        {
            // Attempt to extract currency symbol/code by stripping all numeric characters
            var currencyMatch = Regex.Replace(trimmed, @"[-\d\s.,]", string.Empty);
            if (!string.IsNullOrWhiteSpace(currencyMatch))
            {
                currencyCode = currencyMatch switch
                {
                    "$" => "USD",
                    "€" => "EUR",
                    "£" => "GBP",
                    "¥" => "JPY",
                    "C$" or "CA$" => "CAD",
                    "A$" => "AUD",
                    "R$" => "BRL",
                    "₽" => "RUB",
                    "₹" => "INR",
                    "kr" or "KR" => "SEK",
                    "zł" => "PLN",
                    "₩" => "KRW",
                    _ => currencyMatch
                };
            }

            // Extract numeric portion
            var match = Regex.Match(trimmed, @"-?[\d\s.,]+");
            if (!match.Success)
            {
                return null;
            }

            var numericPart = match.Value.Replace(" ", string.Empty);

            if (numericPart.Contains(',') && numericPart.Contains('.'))
            {
                // Determine decimal separator based on last occurrence
                var lastComma = numericPart.LastIndexOf(',');
                var lastDot = numericPart.LastIndexOf('.');
                if (lastComma > lastDot)
                {
                    // Comma is decimal separator, dot is thousands separator
                    numericPart = numericPart.Replace(".", string.Empty)
                                             .Replace(',', '.');
                }
                else
                {
                    // Dot is decimal separator
                    numericPart = numericPart.Replace(",", string.Empty);
                }
            }
            else if (numericPart.Contains(',') && !numericPart.Contains('.'))
            {
                // Treat comma as decimal separator
                numericPart = numericPart.Replace(',', '.');
            }
            else
            {
                // Remove thousands separators (commas) if any remain
                numericPart = numericPart.Replace(",", string.Empty);
            }

            if (decimal.TryParse(
                    numericPart,
                    NumberStyles.AllowDecimalPoint | NumberStyles.AllowThousands | NumberStyles.AllowLeadingSign,
                    CultureInfo.InvariantCulture,
                    out var parsed))
            {
                return parsed;
            }
        }
        catch
        {
            // Intentionally swallow parsing errors here; caller will handle null
        }

        return null;
    }

    private static int? ParseVolumeString(string? volumeString)
    {
        if (string.IsNullOrWhiteSpace(volumeString))
        {
            return null;
        }

        var match = Regex.Match(volumeString, @"\d[\d\s,.]*");
        if (!match.Success)
        {
            return null;
        }

        var numericPart = match.Value.Replace(" ", string.Empty);
        numericPart = numericPart.Replace(",", string.Empty).Replace(".", string.Empty);

        if (int.TryParse(numericPart, NumberStyles.AllowThousands, CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        return null;
    }

    public async Task<SteamMarketData?> GetMarketDataAsync(string marketHashName, int appId = 730, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(marketHashName))
        {
            return null;
        }

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            var encodedName = Uri.EscapeDataString(marketHashName);
            var url = $"https://steamcommunity.com/market/priceoverview/?appid={appId}&currency=1&market_hash_name={encodedName}";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Accept.Clear();
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            request.Headers.TryAddWithoutValidation("Accept-Language", "en-US,en;q=0.9");
            request.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            request.Headers.TryAddWithoutValidation("Cookie", "Steam_Language=english;steamCountry=US%7C0;timezoneOffset=0,0");

            _logger.LogDebug("Fetching Steam market data for: {MarketHashName}", marketHashName);

            using var response = await httpClient.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Steam Market API returned {StatusCode} for {MarketHashName}", response.StatusCode, marketHashName);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<SteamMarketPriceResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result == null || result.Success != true)
            {
                _logger.LogDebug("Steam Market API returned no data for {MarketHashName}. Success flag: {Success}", marketHashName, result?.Success);
                return new SteamMarketData
                {
                    RawLowestPrice = result?.LowestPrice,
                    RawMedianPrice = result?.MedianPrice
                };
            }

            var lowestPrice = ParsePriceString(result.LowestPrice, out var currencyCode);
            var medianPrice = ParsePriceString(result.MedianPrice, out _);
            var volume = ParseVolumeString(result.Volume);

            if (lowestPrice.HasValue)
            {
                if (lowestPrice.Value > 2000)
                {
                    _logger.LogInformation(
                        "Market price for {MarketHashName} exceeds Steam balance limit ($2000): {Price}",
                        marketHashName,
                        lowestPrice.Value);
                }

                _logger.LogDebug("Fetched market lowest price for {MarketHashName}: {Price}", marketHashName, lowestPrice.Value);
            }
            else
            {
                _logger.LogDebug("Unable to parse lowest price '{RawPrice}' for {MarketHashName}", result.LowestPrice, marketHashName);
            }

            return new SteamMarketData
            {
                LowestPrice = lowestPrice,
                MedianPrice = medianPrice,
                Volume = volume,
                RawLowestPrice = result.LowestPrice,
                RawMedianPrice = result.MedianPrice,
                CurrencyCode = currencyCode
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Steam market data for {MarketHashName}", marketHashName);
            return null;
        }
    }
}

