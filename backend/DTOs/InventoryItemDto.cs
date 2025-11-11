namespace backend.DTOs;

public class InventoryItemDto
{
    public int Id { get; set; }
    public int SkinId { get; set; }
    public string SkinName { get; set; } = string.Empty;
    public string Rarity { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double Float { get; set; }
    public string Exterior { get; set; } = string.Empty;
    public int? PaintSeed { get; set; }
    public decimal Price { get; set; }
    public decimal? Cost { get; set; }
    public string? ImageUrl { get; set; }
    public bool TradeProtected { get; set; }
    public DateTime? TradableAfter { get; set; }
    public DateTime AcquiredAt { get; set; }
}

public class CreateInventoryItemDto
{
    public int SkinId { get; set; }
    public double Float { get; set; }
    public int? PaintSeed { get; set; }
    public decimal Price { get; set; }
    public decimal? Cost { get; set; }
    public string? ImageUrl { get; set; }
    public bool TradeProtected { get; set; }
}

public class UpdateInventoryItemDto
{
    public double Float { get; set; }
    public int? PaintSeed { get; set; }
    public decimal Price { get; set; }
    public decimal? Cost { get; set; }
    public string? ImageUrl { get; set; }
    public bool TradeProtected { get; set; }
}

