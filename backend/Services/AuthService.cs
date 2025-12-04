using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using backend.Models;

namespace backend.Services;

public class AuthService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    private readonly string _jwtSecret;
    private readonly string _jwtIssuer;
    private readonly string _jwtAudience;

    public AuthService(IConfiguration configuration, ILogger<AuthService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _jwtSecret = configuration["JWT:Secret"] ?? Environment.GetEnvironmentVariable("JWT_SECRET") ?? GenerateRandomSecret();
        _jwtIssuer = configuration["JWT:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "cs-inv-tracker";
        _jwtAudience = configuration["JWT:Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "cs-inv-tracker";
        
        if (string.IsNullOrEmpty(_jwtSecret) || _jwtSecret == GenerateRandomSecret())
        {
            _logger.LogWarning("JWT_SECRET not set. Using a random secret that will change on restart. Set JWT_SECRET environment variable for production!");
        }
        else
        {
            _logger.LogInformation("JWT_SECRET loaded successfully. Secret length: {Length}, First 10 chars: {Preview}", 
                _jwtSecret.Length, 
                _jwtSecret.Length > 10 ? _jwtSecret.Substring(0, 10) + "..." : _jwtSecret);
        }
    }

    /// <summary>
    /// Generates a JWT token for a user
    /// </summary>
    public string GenerateToken(User user)
    {
        _logger.LogInformation("Generating token with secret length: {Length}, First 10 chars: {Preview}, Issuer: {Issuer}, Audience: {Audience}", 
            _jwtSecret.Length, 
            _jwtSecret.Length > 10 ? _jwtSecret.Substring(0, 10) + "..." : _jwtSecret,
            _jwtIssuer,
            _jwtAudience);
        
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.SteamId),
            new Claim("steamId", user.SteamId),
            new Claim("userId", user.Id.ToString()),
        };

        if (!string.IsNullOrEmpty(user.Username))
        {
            claims.Add(new Claim(ClaimTypes.GivenName, user.Username));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtIssuer,
            audience: _jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30), // Token valid for 30 days
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        _logger.LogInformation("Token generated successfully. Token length: {Length}", tokenString.Length);
        return tokenString;
    }

    /// <summary>
    /// Validates a JWT token and extracts user ID
    /// </summary>
    public ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            _logger.LogInformation("Validating token with secret length: {Length}, First 10 chars: {Preview}", 
                _jwtSecret.Length, 
                _jwtSecret.Length > 10 ? _jwtSecret.Substring(0, 10) + "..." : _jwtSecret);
            
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSecret);

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _jwtIssuer,
                ValidateAudience = true,
                ValidAudience = _jwtAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RequireSignedTokens = true
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);
            _logger.LogInformation("Token validated successfully");
            return principal;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Token validation failed. Exception type: {Type}, Message: {Message}", 
                ex.GetType().Name, ex.Message);
            return null;
        }
    }

    /// <summary>
    /// Extracts user ID from a validated token
    /// </summary>
    public int? GetUserIdFromToken(string token)
    {
        try
        {
            var principal = ValidateToken(token);
            if (principal == null)
            {
                _logger.LogWarning("Token validation returned null principal");
                return null;
            }

            var userIdClaim = principal.FindFirst("userId")?.Value 
                ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            _logger.LogInformation("Found userId claim: {UserIdClaim}", userIdClaim ?? "null");
            
            if (int.TryParse(userIdClaim, out var userId))
            {
                return userId;
            }

            _logger.LogWarning("Failed to parse userId claim '{UserIdClaim}' as integer", userIdClaim);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception while extracting user ID from token");
            return null;
        }
    }

    /// <summary>
    /// Generates a random secret for development (not for production!)
    /// </summary>
    private static string GenerateRandomSecret()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }
}

