using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class LoadoutEntryDto
{
    [Required]
    public string SlotKey { get; set; } = string.Empty;

    [Required]
    public string Team { get; set; } = string.Empty;

    public int? InventoryItemId { get; set; }

    public int? SkinId { get; set; }

    [Required]
    public string SkinName { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public string? Weapon { get; set; }

    public string? Type { get; set; }
}

public class LoadoutDto
{
    public Guid Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [MinLength(0)]
    public List<LoadoutEntryDto> Entries { get; set; } = new();
}




