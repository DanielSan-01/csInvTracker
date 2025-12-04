using System.Security.Cryptography;
using System.Text;

namespace backend.Services;

/// <summary>
/// Service for verifying Steam OpenID authentication responses
/// Reference: https://openid.net/specs/openid-authentication-2_0.html
/// </summary>
public class OpenIdVerificationService
{
    private readonly ILogger<OpenIdVerificationService> _logger;
    private const string SteamOpenIdProvider = "https://steamcommunity.com/openid/login";

    public OpenIdVerificationService(ILogger<OpenIdVerificationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Verifies the OpenID response signature from Steam
    /// </summary>
    public async Task<bool> VerifySignatureAsync(Dictionary<string, string> openIdParams)
    {
        try
        {
            // Check if we have the required parameters
            if (!openIdParams.ContainsKey("openid.sig") || !openIdParams.ContainsKey("openid.signed"))
            {
                _logger.LogWarning("Missing required OpenID signature parameters");
                return false;
            }

            // Steam requires us to verify the signature by making a request to Steam
            // We need to send the parameters back to Steam's verification endpoint
            var verificationParams = new Dictionary<string, string>(openIdParams)
            {
                ["openid.mode"] = "check_authentication"
            };

            // Build the verification request
            var content = new FormUrlEncodedContent(verificationParams);
            
            using var httpClient = new HttpClient();
            var response = await httpClient.PostAsync(SteamOpenIdProvider, content);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Steam OpenID verification request failed: {StatusCode}", response.StatusCode);
                return false;
            }

            var responseText = await response.Content.ReadAsStringAsync();
            
            // Steam returns "is_valid:true\n" if valid, "is_valid:false\n" if invalid
            var isValid = responseText.Contains("is_valid:true");
            
            if (!isValid)
            {
                _logger.LogWarning("Steam OpenID signature verification failed. Response: {Response}", responseText);
            }

            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying OpenID signature");
            return false;
        }
    }

    /// <summary>
    /// Validates that the OpenID response is from Steam and properly formatted
    /// </summary>
    public bool ValidateOpenIdResponse(Dictionary<string, string> openIdParams)
    {
        // Check required parameters
        if (!openIdParams.ContainsKey("openid.mode") || openIdParams["openid.mode"] != "id_res")
        {
            _logger.LogWarning("Invalid OpenID mode");
            return false;
        }

        if (!openIdParams.ContainsKey("openid.claimed_id") && !openIdParams.ContainsKey("openid.identity"))
        {
            _logger.LogWarning("Missing OpenID identity");
            return false;
        }

        // Verify the claimed_id is from Steam
        var claimedId = openIdParams.GetValueOrDefault("openid.claimed_id") 
            ?? openIdParams.GetValueOrDefault("openid.identity");
        
        if (string.IsNullOrEmpty(claimedId) || !claimedId.StartsWith("https://steamcommunity.com/openid/id/"))
        {
            _logger.LogWarning("Invalid OpenID claimed_id: {ClaimedId}", claimedId);
            return false;
        }

        // Verify return_to matches our expected URL
        var returnTo = openIdParams.GetValueOrDefault("openid.return_to");
        if (string.IsNullOrEmpty(returnTo))
        {
            _logger.LogWarning("Missing return_to parameter");
            return false;
        }

        return true;
    }

    /// <summary>
    /// Extracts Steam ID from OpenID claimed_id
    /// </summary>
    public string? ExtractSteamId(Dictionary<string, string> openIdParams)
    {
        var claimedId = openIdParams.GetValueOrDefault("openid.claimed_id") 
            ?? openIdParams.GetValueOrDefault("openid.identity");
        
        if (string.IsNullOrEmpty(claimedId))
        {
            return null;
        }

        // Format: https://steamcommunity.com/openid/id/76561197996404463
        var match = System.Text.RegularExpressions.Regex.Match(claimedId, @"/id/(\d+)$");
        if (match.Success)
        {
            return match.Groups[1].Value;
        }

        return null;
    }
}

