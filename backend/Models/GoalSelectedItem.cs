using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class GoalSelectedItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    public Guid GoalId { get; set; }

    /// <summary>
    /// Original inventory item identifier, if the item came from the user's inventory.
    /// Stored for reference only.
    /// </summary>
    public int? SourceInventoryItemId { get; set; }

    [Required]
    public string SkinName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    public bool TradeProtected { get; set; }

    public string? ImageUrl { get; set; }

    public string? Weapon { get; set; }

    public string? Type { get; set; }

    // Navigation
    public Goal Goal { get; set; } = null!;
}


