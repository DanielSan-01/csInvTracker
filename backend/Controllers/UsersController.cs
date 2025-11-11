using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UsersController> _logger;

    public UsersController(ApplicationDbContext context, ILogger<UsersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/users/by-steam/{steamId}
    // Get or create user by Steam ID
    [HttpGet("by-steam/{steamId}")]
    public async Task<ActionResult<User>> GetOrCreateUserBySteamId(string steamId)
    {
        try
        {
            // Try to find existing user
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.SteamId == steamId);

            if (user != null)
            {
                // Update last login time
                user.LastLoginAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                
                _logger.LogInformation($"User found: {user.Id} (Steam ID: {steamId})");
                return Ok(user);
            }

            // Create new user
            var newUser = new User
            {
                SteamId = steamId,
                Username = $"User_{steamId.Substring(steamId.Length - 6)}", // Last 6 digits
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"New user created: {newUser.Id} (Steam ID: {steamId})");
            return Ok(newUser);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error getting/creating user for Steam ID: {steamId}");
            return StatusCode(500, "An error occurred while processing the user");
        }
    }

    // GET: api/users/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(int id)
    {
        try
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching user {id}");
            return StatusCode(500, "An error occurred while fetching the user");
        }
    }
}

