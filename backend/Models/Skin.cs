using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Skin
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Rarity { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? Collection { get; set; }
    
    [MaxLength(100)]
    public string? Weapon { get; set; }
    
    [MaxLength(500)]
    public string? ImageUrl { get; set; }
    
    public decimal? DefaultPrice { get; set; }
    
    // Navigation property
    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}
