using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class GoalDto
{
    public Guid? Id { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public int? UserId { get; set; }

    [Required]
    public string SkinName { get; set; } = string.Empty;

    public int? SkinId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal TargetPrice { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Balance { get; set; }

    [Range(0, double.MaxValue)]
    public decimal SelectedTotal { get; set; }

    [Range(0, double.MaxValue)]
    public decimal CoverageTotal { get; set; }

    [Range(0, double.MaxValue)]
    public decimal RemainingAmount { get; set; }

    [Range(0, double.MaxValue)]
    public decimal SurplusAmount { get; set; }

    public string? SkinImageUrl { get; set; }

    public string? SkinAltImageUrl { get; set; }

    public string? SkinRarity { get; set; }

    public string? SkinType { get; set; }

    public string? SkinWeapon { get; set; }

    [MinLength(0)]
    public List<GoalSelectedItemDto> SelectedItems { get; set; } = new();
}


