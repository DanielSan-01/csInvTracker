using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class LoadoutFavoriteEntry
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid LoadoutFavoriteId { get; set; }

    [Required]
    [MaxLength(100)]
    public string SlotKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(8)]
    public string Team { get; set; } = string.Empty;

    public int? InventoryItemId { get; set; }

    public int? SkinId { get; set; }

    [Required]
    [MaxLength(200)]
    public string SkinName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    [MaxLength(100)]
    public string? Weapon { get; set; }

    [MaxLength(100)]
    public string? Type { get; set; }

    // Navigation
    public LoadoutFavorite Loadout { get; set; } = null!;

    public InventoryItem? InventoryItem { get; set; }

    public Skin? Skin { get; set; }
}





