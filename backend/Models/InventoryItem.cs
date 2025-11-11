using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class InventoryItem
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int SkinId { get; set; }
    
    [Required]
    public double Float { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Exterior { get; set; } = string.Empty;
    
    public int? PaintSeed { get; set; }
    
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? Cost { get; set; }
    
    [MaxLength(500)]
    public string? ImageUrl { get; set; }
    
    public bool TradeProtected { get; set; }
    
    public DateTime? TradableAfter { get; set; }
    
    public DateTime AcquiredAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    [ForeignKey("SkinId")]
    public Skin Skin { get; set; } = null!;
}
