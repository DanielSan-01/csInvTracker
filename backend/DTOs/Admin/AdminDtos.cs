using System;
using System.Collections.Generic;

namespace backend.DTOs.Admin;

public class SkinStats
{
    public int TotalSkins { get; set; }
    public Dictionary<string, int> ByRarity { get; set; } = new();
    public Dictionary<string, int> ByType { get; set; } = new();
    public Dictionary<string, int> TopCollections { get; set; } = new();
}

public class BulkImportInventoryRequest
{
    public int UserId { get; set; }
    public List<BulkImportInventoryItem> Items { get; set; } = new();
}

public class BulkImportInventoryItem
{
    public string SkinName { get; set; } = string.Empty;
    public double Float { get; set; }
    public decimal Price { get; set; }
    public decimal? Cost { get; set; }
    public int? PaintSeed { get; set; }
    public bool? TradeProtected { get; set; }
}

public class BulkImportInventoryResult
{
    public int UserId { get; set; }
    public int TotalRequested { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class AdminUserDto
{
    public int Id { get; set; }
    public string SteamId { get; set; } = string.Empty;
    public string? Username { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastLoginAt { get; set; }
    public int ItemCount { get; set; }
    public decimal TotalValue { get; set; }
    public decimal TotalCost { get; set; }
}

public class AdminStats
{
    public int TotalUsers { get; set; }
    public int TotalSkins { get; set; }
    public int TotalInventoryItems { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public List<RecentActivityDto> RecentActivity { get; set; } = new();
}

public class RecentActivityDto
{
    public string UserName { get; set; } = string.Empty;
    public string SkinName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class CreateSkinDto
{
    public string Name { get; set; } = string.Empty;
    public string Rarity { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Collection { get; set; }
    public string? Weapon { get; set; }
    public string? ImageUrl { get; set; }
    public decimal? DefaultPrice { get; set; }
    public int? PaintIndex { get; set; }
}

public class UpdateSkinPriceDto
{
    public decimal? DefaultPrice { get; set; }
}


