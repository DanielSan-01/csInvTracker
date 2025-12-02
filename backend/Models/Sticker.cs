using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class Sticker
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int InventoryItemId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? Price { get; set; }
    
    public int? Slot { get; set; }
    
    [MaxLength(500)]
    public string? ImageUrl { get; set; }
    
    // Navigation property
    [ForeignKey("InventoryItemId")]
    public InventoryItem InventoryItem { get; set; } = null!;
}

