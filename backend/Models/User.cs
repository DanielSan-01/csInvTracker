using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class User
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public string SteamId { get; set; } = string.Empty;
    
    public string? Username { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}

