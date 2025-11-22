using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class GoalSelectedItemDto
{
    /// <summary>
    /// Identifier of the original inventory item, if applicable.
    /// </summary>
    public int? InventoryItemId { get; set; }

    [Required]
    public string SkinName { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    public bool TradeProtected { get; set; }

    public string? ImageUrl { get; set; }

    public string? Weapon { get; set; }

    public string? Type { get; set; }
}


