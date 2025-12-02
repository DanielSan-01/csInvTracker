namespace backend.DTOs;

public class StickerDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public int? Slot { get; set; }
    public string? ImageUrl { get; set; }
}

public class CreateStickerDto
{
    public string Name { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public int? Slot { get; set; }
    public string? ImageUrl { get; set; }
}

public class StickerCatalogDto
{
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal? AveragePrice { get; set; }
}

