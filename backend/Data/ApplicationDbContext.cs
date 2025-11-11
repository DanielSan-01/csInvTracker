using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Skin> Skins { get; set; } = null!;
    public DbSet<InventoryItem> InventoryItems { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Configure relationships
        modelBuilder.Entity<InventoryItem>()
            .HasOne(i => i.Skin)
            .WithMany(s => s.InventoryItems)
            .HasForeignKey(i => i.SkinId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // Seed initial skin data
        SeedData(modelBuilder);
    }
    
    private void SeedData(ModelBuilder modelBuilder)
    {
        // NOTE: For full skin catalog (~2500 skins), use the Admin API Import endpoint
        // This seed data is just for initial testing
        modelBuilder.Entity<Skin>().HasData(
            new Skin { Id = 1, Name = "AK-47 | Fire Serpent", Rarity = "Covert", Type = "Rifle", Weapon = "AK-47", Collection = "Bravo", DefaultPrice = 1049, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AK-47+Fire+Serpent" },
            new Skin { Id = 2, Name = "AWP | Dragon Lore", Rarity = "Covert", Type = "Sniper Rifle", Weapon = "AWP", Collection = "Cobblestone", DefaultPrice = 5000, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AWP+Dragon+Lore" },
            new Skin { Id = 3, Name = "M4A4 | Howl", Rarity = "Contraband", Type = "Rifle", Weapon = "M4A4", Collection = "Huntsman", DefaultPrice = 3000, ImageUrl = "https://via.placeholder.com/300x200/F97316/FFFFFF?text=M4A4+Howl" },
            new Skin { Id = 4, Name = "Desert Eagle | Blaze", Rarity = "Restricted", Type = "Pistol", Weapon = "Desert Eagle", Collection = "Dust", DefaultPrice = 250, ImageUrl = "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Deagle+Blaze" },
            new Skin { Id = 5, Name = "Glock-18 | Fade", Rarity = "Restricted", Type = "Pistol", Weapon = "Glock-18", Collection = "Assault", DefaultPrice = 150, ImageUrl = "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Glock+Fade" }
        );
    }
}

