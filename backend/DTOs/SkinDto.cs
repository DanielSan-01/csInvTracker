namespace backend.DTOs;

public class SkinDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Rarity { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal? DefaultPrice { get; set; }
}

