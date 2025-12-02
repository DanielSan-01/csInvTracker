using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Skin> Skins { get; set; } = null!;
    public DbSet<InventoryItem> InventoryItems { get; set; } = null!;
    public DbSet<Sticker> Stickers { get; set; } = null!;
    public DbSet<Goal> Goals { get; set; } = null!;
    public DbSet<GoalSelectedItem> GoalSelectedItems { get; set; } = null!;
    public DbSet<LoadoutFavorite> LoadoutFavorites { get; set; } = null!;
    public DbSet<LoadoutFavoriteEntry> LoadoutFavoriteEntries { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Configure User unique constraint on SteamId
        modelBuilder.Entity<User>()
            .HasIndex(u => u.SteamId)
            .IsUnique();
        
        // Configure User -> InventoryItems relationship
        modelBuilder.Entity<User>()
            .HasMany(u => u.InventoryItems)
            .WithOne(i => i.User)
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        
        modelBuilder.Entity<User>()
            .HasMany(u => u.Goals)
            .WithOne(g => g.User)
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        
        modelBuilder.Entity<User>()
            .HasMany(u => u.LoadoutFavorites)
            .WithOne(l => l.User)
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        
        modelBuilder.Entity<Goal>()
            .HasMany(g => g.SelectedItems)
            .WithOne(si => si.Goal)
            .HasForeignKey(si => si.GoalId)
            .OnDelete(DeleteBehavior.Cascade);
        
        modelBuilder.Entity<LoadoutFavorite>()
            .HasMany(l => l.Entries)
            .WithOne(e => e.Loadout)
            .HasForeignKey(e => e.LoadoutFavoriteId)
            .OnDelete(DeleteBehavior.Cascade);
        
        modelBuilder.Entity<LoadoutFavoriteEntry>()
            .HasOne(e => e.InventoryItem)
            .WithMany()
            .HasForeignKey(e => e.InventoryItemId)
            .OnDelete(DeleteBehavior.SetNull);
        
        modelBuilder.Entity<LoadoutFavoriteEntry>()
            .HasOne(e => e.Skin)
            .WithMany()
            .HasForeignKey(e => e.SkinId)
            .OnDelete(DeleteBehavior.SetNull);
        
        // Configure InventoryItem -> Skin relationship
        modelBuilder.Entity<InventoryItem>()
            .HasOne(i => i.Skin)
            .WithMany(s => s.InventoryItems)
            .HasForeignKey(i => i.SkinId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // Configure InventoryItem -> Stickers relationship
        modelBuilder.Entity<InventoryItem>()
            .HasMany(i => i.Stickers)
            .WithOne(s => s.InventoryItem)
            .HasForeignKey(s => s.InventoryItemId)
            .OnDelete(DeleteBehavior.Cascade);
        
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

