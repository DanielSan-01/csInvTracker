using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace backend.Services;

/// <summary>
/// Simple admin authorization helper using a whitelist of Steam IDs.
/// Configure via appsettings (Admin:SteamIds) or environment variable ADMIN_STEAM_IDS (comma-separated).
/// </summary>
public class AdminAuthorizationService
{
    private readonly HashSet<string> _adminSteamIds;

    public AdminAuthorizationService(IConfiguration configuration, ILogger<AdminAuthorizationService> logger)
    {
        var ids = new List<string>();

        // appsettings: "Admin": { "SteamIds": ["123", "456"] }
        var configured = configuration.GetSection("Admin:SteamIds").Get<string[]>();
        if (configured != null)
        {
            ids.AddRange(configured);
        }

        // Environment variable: ADMIN_STEAM_IDS=123,456
        var env = Environment.GetEnvironmentVariable("ADMIN_STEAM_IDS");
        if (!string.IsNullOrWhiteSpace(env))
        {
            ids.AddRange(env.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        }

        _adminSteamIds = ids
            .Select(x => x.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (_adminSteamIds.Count == 0)
        {
            logger.LogWarning("No admin Steam IDs configured. Set Admin:SteamIds in configuration or ADMIN_STEAM_IDS env var.");
        }
        else
        {
            logger.LogInformation("Admin whitelist loaded with {Count} Steam IDs.", _adminSteamIds.Count);
        }
    }

    public bool IsAdminSteamId(string? steamId)
    {
        if (string.IsNullOrWhiteSpace(steamId))
        {
            return false;
        }

        return _adminSteamIds.Contains(steamId);
    }
}

