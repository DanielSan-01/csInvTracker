using System.Text.Json;

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
        if (string.IsNullOrWhiteSpace(marketHashName))
        {
            return null;
        }

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);
            
            // Steam Market API endpoint
            // appid=730 is CS:GO/CS2
            // currency=1 is USD
            var encodedName = Uri.EscapeDataString(marketHashName);
            var url = $"https://steamcommunity.com/market/priceoverview/?appid={appId}&currency=1&market_hash_name={encodedName}";
            
            _logger.LogDebug("Fetching Steam market price for: {MarketHashName}", marketHashName);
            
            var response = await httpClient.GetAsync(url, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Steam Market API returned {StatusCode} for {MarketHashName}", 
                    response.StatusCode, marketHashName);
                return null;
            }
            
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<SteamMarketPriceResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result?.Success != true || string.IsNullOrWhiteSpace(result.LowestPrice))
            {
                _logger.LogDebug("No price data available for {MarketHashName}", marketHashName);
                return null;
            }

            // Parse price string (format: "$1,234.56" or "$1234.56")
            var priceString = result.LowestPrice
                .Replace("$", "")
                .Replace(",", "")
                .Trim();

            if (decimal.TryParse(priceString, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var price))
            {
                // Log warning if price exceeds Steam's $2000 limit
                if (price > 2000)
                {
                    _logger.LogInformation("Market price for {MarketHashName} exceeds Steam balance limit ($2000): ${Price}", 
                        marketHashName, price);
                }
                
                _logger.LogDebug("Fetched market price for {MarketHashName}: ${Price}", marketHashName, price);
                return price;
            }

            _logger.LogWarning("Failed to parse price '{PriceString}' for {MarketHashName}", 
                result.LowestPrice, marketHashName);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Steam market price for {MarketHashName}", marketHashName);
            return null;
        }
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

            var price = await GetMarketPriceAsync(marketHashName, appId, cancellationToken);
            results[marketHashName] = price;

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
}

