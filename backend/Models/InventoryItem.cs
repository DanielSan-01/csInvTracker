using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class InventoryItem
{
    public int Id { get; set; }

    [Required]
    public int SkinId { get; set; }

    public Skin Skin { get; set; } = null!;

    [Required]
    [MaxLength(64)]
    public string OwnerSteamId { get; set; } = "local-default";

    [MaxLength(32)]
    public string Exterior { get; set; } = "Field-Tested";

    [Column(TypeName = "double precision")]
    public double? FloatValue { get; set; }

    public int? PaintSeed { get; set; }

    [MaxLength(128)]
    public string? PatternName { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal Price { get; set; }

    [Column(TypeName = "numeric(12,2)")]
    public decimal? Cost { get; set; }

    public bool TradeProtected { get; set; }

    public DateTime? TradableAfter { get; set; }

    [MaxLength(512)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}

