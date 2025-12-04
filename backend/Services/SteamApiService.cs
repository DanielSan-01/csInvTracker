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
}

