using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Skin
{
    public int Id { get; set; }

    [Required]
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string Rarity { get; set; } = string.Empty;

    [MaxLength(64)]
    public string? Type { get; set; }

    [MaxLength(256)]
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>
    /// Optional default exterior for reference (e.g., Factory New, Field-Tested)
    /// </summary>
    [MaxLength(32)]
    public string? DefaultExterior { get; set; }

    /// <summary>
    /// A short slug or normalized identifier.
    /// </summary>
    [MaxLength(128)]
    public string? Slug { get; set; }

    public decimal DefaultPrice { get; set; }

    [MaxLength(64)]
    public string Game { get; set; } = "Counter-Strike 2";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

