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
        modelBuilder.Entity<Skin>().HasData(
            // Gloves
            new Skin { Id = 1, Name = "Sport Gloves | Pandora's Box", Rarity = "Extraordinary", Type = "Gloves", DefaultPrice = 4500, ImageUrl = "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Sport+Gloves+Pandora" },
            new Skin { Id = 2, Name = "Sport Gloves | Nocts", Rarity = "Extraordinary", Type = "Gloves", DefaultPrice = 680, ImageUrl = "https://community.fastly.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Tk5UvzWCL2kpn2-DFk_OKherB0H_qSCXKR09F-teB_Vmfjwkh_smuAzdasdniWaVNzAsYmQuYJ5hTsk4KxP-PhtAGI2opFzin_kGoXufyYXYCg/330x192?allow_animated=1" },
            new Skin { Id = 3, Name = "Moto Gloves | Spearmint", Rarity = "Extraordinary", Type = "Gloves", DefaultPrice = 700, ImageUrl = "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Moto+Gloves+Spearmint" },
            new Skin { Id = 4, Name = "Specialist Gloves | Foundation", Rarity = "Extraordinary", Type = "Gloves", DefaultPrice = 290, ImageUrl = "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Specialist+Gloves+Foundation" },
            
            // Knives
            new Skin { Id = 5, Name = "Butterfly Knife | Doppler (Phase 4)", Rarity = "Extraordinary", Type = "Knife", DefaultPrice = 3500, ImageUrl = "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Butterfly+Doppler" },
            new Skin { Id = 6, Name = "Karambit | Tiger Tooth", Rarity = "Extraordinary", Type = "Knife", DefaultPrice = 1500, ImageUrl = "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Karambit+Tiger+Tooth" },
            new Skin { Id = 7, Name = "Butterfly Knife | Black Laminate", Rarity = "Extraordinary", Type = "Knife", DefaultPrice = 800, ImageUrl = "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Butterfly+Black+Laminate" },
            new Skin { Id = 8, Name = "Skeleton Knife | Urban Masked", Rarity = "Extraordinary", Type = "Knife", DefaultPrice = 250, ImageUrl = "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Skeleton+Urban+Masked" },
            
            // Agents
            new Skin { Id = 9, Name = "Vypa Sista of the Revolution | Guerrilla Warfare", Rarity = "Restricted", Type = "Agent", DefaultPrice = 80, ImageUrl = "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Vypa+Sista" },
            new Skin { Id = 10, Name = "Number K | The Professionals", Rarity = "Restricted", Type = "Agent", DefaultPrice = 70, ImageUrl = "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Number+K" },
            
            // Rifles
            new Skin { Id = 11, Name = "AK-47 | Fire Serpent", Rarity = "Covert", Type = "Rifle", DefaultPrice = 1049, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AK-47+Fire+Serpent" },
            new Skin { Id = 12, Name = "M4A4 | X-Ray", Rarity = "Covert", Type = "Rifle", DefaultPrice = 100, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=M4A4+X-Ray" },
            new Skin { Id = 13, Name = "AK-47 | Head Shot", Rarity = "Covert", Type = "Rifle", DefaultPrice = 33, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AK-47+Head+Shot" },
            
            // Pistols
            new Skin { Id = 14, Name = "USP-S | Printstream", Rarity = "Covert", Type = "Pistol", DefaultPrice = 33, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=USP-S+Printstream" },
            new Skin { Id = 15, Name = "Desert Eagle | Printstream", Rarity = "Covert", Type = "Pistol", DefaultPrice = 30, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Desert+Eagle+Printstream" },
            new Skin { Id = 16, Name = "Glock-18 | Gold Toof", Rarity = "Covert", Type = "Pistol", DefaultPrice = 16, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Glock+Gold+Toof" },
            
            // SMGs
            new Skin { Id = 17, Name = "MAC-10 | Neon Rider", Rarity = "Covert", Type = "SMG", DefaultPrice = 115, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=MAC-10+Neon+Rider" },
            new Skin { Id = 18, Name = "MP7 | Fade 99%", Rarity = "Restricted", Type = "SMG", DefaultPrice = 3, ImageUrl = "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=MP7+Fade" },
            
            // Sniper Rifles
            new Skin { Id = 19, Name = "AWP | Printstream", Rarity = "Covert", Type = "Sniper Rifle", DefaultPrice = 53, ImageUrl = "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AWP+Printstream" }
        );
    }
}

