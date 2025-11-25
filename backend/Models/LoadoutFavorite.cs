using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class LoadoutFavorite
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;

    public ICollection<LoadoutFavoriteEntry> Entries { get; set; } = new List<LoadoutFavoriteEntry>();
}




