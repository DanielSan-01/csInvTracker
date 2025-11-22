using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class Goal
{
    [Key]
    public Guid Id { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public int? UserId { get; set; }

    [Required]
    public string SkinName { get; set; } = string.Empty;

    public int? SkinId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TargetPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Balance { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal SelectedTotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal CoverageTotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal RemainingAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal SurplusAmount { get; set; }

    public string? SkinImageUrl { get; set; }

    public string? SkinAltImageUrl { get; set; }

    public string? SkinRarity { get; set; }

    public string? SkinType { get; set; }

    public string? SkinWeapon { get; set; }

    // Navigation
    public User? User { get; set; }

    public ICollection<GoalSelectedItem> SelectedItems { get; set; } = new List<GoalSelectedItem>();
}


