using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly AuthService _authService;
    private readonly SteamApiService _steamApiService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ApplicationDbContext context,
        AuthService authService,
        SteamApiService steamApiService,
        ILogger<AuthController> logger)
    {
        _context = context;
        _authService = authService;
        _steamApiService = steamApiService;
        _logger = logger;
    }

    /// <summary>
    /// Creates a session for a user after Steam OpenID authentication
    /// POST /api/auth/login
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.SteamId))
            {
                return BadRequest(new { error = "Steam ID is required" });
            }

            // Get or create user
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.SteamId == request.SteamId);

            if (user == null)
            {
                // Fetch Steam profile to create user with proper data
                var steamProfile = await _steamApiService.GetPlayerSummaryAsync(request.SteamId);
                
                user = new User
                {
                    SteamId = request.SteamId,
                    Username = steamProfile?.PersonaName ?? $"User_{request.SteamId.Substring(request.SteamId.Length - 6)}",
                    DisplayName = steamProfile?.PersonaName,
                    AvatarUrl = steamProfile?.Avatar,
                    AvatarMediumUrl = steamProfile?.AvatarMedium,
                    AvatarFullUrl = steamProfile?.AvatarFull,
                    ProfileUrl = steamProfile?.ProfileUrl,
                    CreatedAt = DateTime.UtcNow,
                    LastLoginAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("New user created: {UserId} (Steam ID: {SteamId})", user.Id, request.SteamId);
            }
            else
            {
                // Update last login and profile data
                user.LastLoginAt = DateTime.UtcNow;
                
                var steamProfile = await _steamApiService.GetPlayerSummaryAsync(request.SteamId);
                if (steamProfile != null)
                {
                    user.DisplayName = steamProfile.PersonaName;
                    user.AvatarUrl = steamProfile.Avatar;
                    user.AvatarMediumUrl = steamProfile.AvatarMedium;
                    user.AvatarFullUrl = steamProfile.AvatarFull;
                    user.ProfileUrl = steamProfile.ProfileUrl;
                    if (string.IsNullOrEmpty(user.Username))
                    {
                        user.Username = steamProfile.PersonaName;
                    }
                }
                
                await _context.SaveChangesAsync();
            }

            // Generate JWT token
            var token = _authService.GenerateToken(user);

            // Set secure HTTP-only cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = !Request.Host.Host.Contains("localhost"), // Only use Secure in production
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(30),
                Path = "/"
            };

            Response.Cookies.Append("auth_token", token, cookieOptions);

            return Ok(new LoginResponse
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    SteamId = user.SteamId,
                    Username = user.Username,
                    DisplayName = user.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    AvatarMediumUrl = user.AvatarMediumUrl,
                    AvatarFullUrl = user.AvatarFullUrl,
                    ProfileUrl = user.ProfileUrl,
                    CreatedAt = user.CreatedAt,
                    LastLoginAt = user.LastLoginAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for Steam ID: {SteamId}", request.SteamId);
            return StatusCode(500, new { error = "An error occurred during login" });
        }
    }

    /// <summary>
    /// Verifies the current session and returns user info
    /// GET /api/auth/me
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetCurrentUser()
    {
        try
        {
            // Try to get token from cookie first, then from Authorization header
            var token = Request.Cookies["auth_token"] 
                ?? Request.Headers["Authorization"].ToString().Replace("Bearer ", "");

            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized(new { error = "No authentication token provided" });
            }

            var userId = _authService.GetUserIdFromToken(token);
            if (userId == null)
            {
                return Unauthorized(new { error = "Invalid or expired token" });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return Unauthorized(new { error = "User not found" });
            }

            return Ok(new UserDto
            {
                Id = user.Id,
                SteamId = user.SteamId,
                Username = user.Username,
                DisplayName = user.DisplayName,
                AvatarUrl = user.AvatarUrl,
                AvatarMediumUrl = user.AvatarMediumUrl,
                AvatarFullUrl = user.AvatarFullUrl,
                ProfileUrl = user.ProfileUrl,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user");
            return StatusCode(500, new { error = "An error occurred while fetching user" });
        }
    }

    /// <summary>
    /// Verifies Steam OpenID response signature
    /// POST /api/auth/verify-openid
    /// </summary>
    [HttpPost("verify-openid")]
    public async Task<ActionResult<VerifyOpenIdResponse>> VerifyOpenId([FromBody] VerifyOpenIdRequest request)
    {
        try
        {
            var verificationService = HttpContext.RequestServices.GetRequiredService<OpenIdVerificationService>();

            // Validate OpenID response format
            if (!verificationService.ValidateOpenIdResponse(request.OpenIdParams))
            {
                return BadRequest(new { error = "Invalid OpenID response format" });
            }

            // Verify signature with Steam
            var isValid = await verificationService.VerifySignatureAsync(request.OpenIdParams);
            if (!isValid)
            {
                return Unauthorized(new { error = "OpenID signature verification failed" });
            }

            // Extract Steam ID
            var steamId = verificationService.ExtractSteamId(request.OpenIdParams);
            if (string.IsNullOrEmpty(steamId))
            {
                return BadRequest(new { error = "Could not extract Steam ID from OpenID response" });
            }

            return Ok(new VerifyOpenIdResponse
            {
                Valid = true,
                SteamId = steamId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying OpenID response");
            return StatusCode(500, new { error = "An error occurred during verification" });
        }
    }

    /// <summary>
    /// Logs out the current user
    /// POST /api/auth/logout
    /// </summary>
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("auth_token", new CookieOptions
        {
            HttpOnly = true,
            Secure = !Request.Host.Host.Contains("localhost"),
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });

        return Ok(new { message = "Logged out successfully" });
    }
}

public class VerifyOpenIdRequest
{
    public Dictionary<string, string> OpenIdParams { get; set; } = new();
}

public class VerifyOpenIdResponse
{
    public bool Valid { get; set; }
    public string SteamId { get; set; } = string.Empty;
}

public class LoginRequest
{
    public string SteamId { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = null!;
}

public class UserDto
{
    public int Id { get; set; }
    public string SteamId { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? AvatarMediumUrl { get; set; }
    public string? AvatarFullUrl { get; set; }
    public string? ProfileUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastLoginAt { get; set; }
}

