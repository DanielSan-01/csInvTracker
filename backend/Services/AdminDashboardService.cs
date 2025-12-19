using System;
using System.Collections.Generic;
using System.Linq;
using System.Globalization;
using System.Text;
using backend.Data;
using backend.DTOs.Admin;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace backend.Services;

public class AdminDashboardService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminDashboardService> _logger;

    public AdminDashboardService(ApplicationDbContext context, ILogger<AdminDashboardService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<AdminUserDto>> GetAllUsersAsync()
    {
        var users = await _context.Users
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                SteamId = u.SteamId,
                Username = u.Username,
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                ItemCount = u.InventoryItems.Count,
                TotalValue = u.InventoryItems
                    .Sum(i => (decimal?)i.Price) ?? 0m,
                TotalCost = u.InventoryItems
                    .Sum(i => (decimal?)i.Cost) ?? 0m
            })
            .OrderByDescending(u => u.LastLoginAt)
            .ToListAsync();

        return users;
    }

    public async Task<AdminStats> GetSystemStatsAsync()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalSkins = await _context.Skins.CountAsync();
        var totalItems = await _context.InventoryItems.CountAsync();
        var totalValue = await _context.InventoryItems
            .Select(i => (decimal?)i.Price)
            .SumAsync() ?? 0m;

        var recentActivity = await _context.InventoryItems
            .OrderByDescending(i => i.AcquiredAt)
            .Take(10)
            .Include(i => i.Skin)
            .Include(i => i.User)
            .Select(i => new RecentActivityDto
            {
                UserName = i.User.Username ?? i.User.SteamId,
                SkinName = i.Skin.Name,
                Action = "Added",
                Timestamp = i.AcquiredAt
            })
            .ToListAsync();

        return new AdminStats
        {
            TotalUsers = totalUsers,
            TotalSkins = totalSkins,
            TotalInventoryItems = totalItems,
            TotalInventoryValue = totalValue,
            RecentActivity = recentActivity
        };
    }

    public async Task<Skin> CreateSkinAsync(CreateSkinDto dto)
    {
        var existingSkin = await _context.Skins
            .FirstOrDefaultAsync(s => s.Name == dto.Name);

        if (existingSkin != null)
        {
            throw new InvalidOperationException("A skin with this name already exists");
        }

        var newSkin = new Skin
        {
            Name = dto.Name,
            Rarity = dto.Rarity,
            Type = dto.Type,
            Collection = dto.Collection,
            Weapon = dto.Weapon,
            ImageUrl = dto.ImageUrl ?? string.Empty,
            DefaultPrice = dto.DefaultPrice,
            PaintIndex = dto.PaintIndex
        };

        _context.Skins.Add(newSkin);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created new skin: {SkinName} (ID: {SkinId})", newSkin.Name, newSkin.Id);

        return newSkin;
    }

    public async Task<Skin?> UpdateSkinPriceAsync(int skinId, decimal? defaultPrice)
    {
        var skin = await _context.Skins.FirstOrDefaultAsync(s => s.Id == skinId);
        if (skin == null)
        {
            return null;
        }

        skin.DefaultPrice = defaultPrice;
        await _context.SaveChangesAsync();
        _logger.LogInformation("Updated skin {SkinId} default price to {DefaultPrice}", skinId, defaultPrice);

        return skin;
    }

    public async Task<SkinStats> GetSkinStatsAsync()
    {
        var total = await _context.Skins.CountAsync();
        var byRarity = await _context.Skins
            .GroupBy(s => s.Rarity)
            .Select(g => new { Rarity = g.Key, Count = g.Count() })
            .ToListAsync();
        var byType = await _context.Skins
            .GroupBy(s => s.Type)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToListAsync();
        var byCollection = await _context.Skins
            .GroupBy(s => s.Collection)
            .Select(g => new { Collection = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .Take(10)
            .ToListAsync();

        return new SkinStats
        {
            TotalSkins = total,
            ByRarity = byRarity.ToDictionary(x => x.Rarity, x => x.Count),
            ByType = byType.ToDictionary(x => x.Type, x => x.Count),
            TopCollections = byCollection.ToDictionary(x => x.Collection ?? "Unknown", x => x.Count)
        };
    }

    public async Task<int> ClearSkinsAsync()
    {
        var skinsToDelete = await _context.Skins
            .Where(s => !s.InventoryItems.Any())
            .ToListAsync();

        _context.Skins.RemoveRange(skinsToDelete);
        await _context.SaveChangesAsync();

        return skinsToDelete.Count;
    }

    public async Task<int> ClearAllInventoryAsync()
    {
        var stickerCount = await _context.Stickers.CountAsync();
        if (stickerCount > 0)
        {
            _context.Stickers.RemoveRange(_context.Stickers);
        }

        var inventoryItems = await _context.InventoryItems.ToListAsync();
        if (inventoryItems.Count == 0)
        {
            return 0;
        }

        _context.InventoryItems.RemoveRange(inventoryItems);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Cleared {ItemCount} inventory items and {StickerCount} stickers", inventoryItems.Count, stickerCount);

        return inventoryItems.Count;
    }

    public async Task<BulkImportInventoryResult> BulkImportInventoryAsync(BulkImportInventoryRequest request)
    {
        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {request.UserId} not found");
        }

        var results = new BulkImportInventoryResult
        {
            UserId = request.UserId,
            TotalRequested = request.Items.Count,
            SuccessCount = 0,
            FailedCount = 0,
            Errors = new List<string>()
        };

        var allSkins = await _context.Skins.ToListAsync();

        foreach (var item in request.Items)
        {
            try
            {
                var skin = FindMatchingSkin(allSkins, item.SkinName);

                if (skin == null)
                {
                    results.FailedCount++;
                    results.Errors.Add($"Skin not found: {item.SkinName}");
                    continue;
                }

                var inventoryItem = new InventoryItem
                {
                    UserId = request.UserId,
                    SkinId = skin.Id,
                    Float = item.Float,
                    Exterior = GetExteriorFromFloat(item.Float),
                    PaintSeed = item.PaintSeed,
                    Price = item.Price,
                    Cost = item.Cost,
                    TradeProtected = item.TradeProtected ?? false,
                    TradableAfter = (item.TradeProtected ?? false) ? CalculateValveTradeLockDate(7) : null,
                    AcquiredAt = DateTime.UtcNow
                };

                _context.InventoryItems.Add(inventoryItem);
                results.SuccessCount++;
            }
            catch (Exception ex)
            {
                results.FailedCount++;
                results.Errors.Add($"Error processing {item.SkinName}: {ex.Message}");
                _logger.LogError(ex, "Error processing inventory item {SkinName}", item.SkinName);
            }
        }

        await _context.SaveChangesAsync();
        return results;
    }

    public async Task<(List<InventoryItemDto> Items, int Total)> GetUserInventoryPageAsync(int userId, int skip, int take)
    {
        var query = _context.InventoryItems
            .Include(i => i.Skin)
            .Include(i => i.Stickers)
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.AcquiredAt);

        var total = await query.CountAsync();

        var items = await query
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var dtoItems = items.Select(MapToDto).ToList();
        return (dtoItems, total);
    }

    public async Task<InventoryItemDto?> UpdateInventoryItemAsync(int userId, int inventoryItemId, UpdateInventoryItemDto dto)
    {
        var item = await _context.InventoryItems
            .Include(i => i.Skin)
            .Include(i => i.Stickers)
            .FirstOrDefaultAsync(i => i.Id == inventoryItemId && i.UserId == userId);

        if (item == null)
        {
            return null;
        }

        item.Float = dto.Float;
        item.PaintSeed = dto.PaintSeed;
        item.Price = dto.Price;
        item.Cost = dto.Cost;
        item.ImageUrl = dto.ImageUrl;
        item.TradeProtected = dto.TradeProtected;
        item.TradableAfter = dto.TradableAfter;

        // Replace stickers
        item.Stickers.Clear();
        if (dto.Stickers != null && dto.Stickers.Any())
        {
            foreach (var s in dto.Stickers)
            {
                item.Stickers.Add(new Sticker
                {
                    Name = s.Name,
                    Price = s.Price,
                    Slot = s.Slot,
                    ImageUrl = s.ImageUrl
                });
            }
        }

        await _context.SaveChangesAsync();
        return MapToDto(item);
    }

    private static InventoryItemDto MapToDto(InventoryItem item)
    {
        return new InventoryItemDto
        {
            Id = item.Id,
            SkinId = item.SkinId,
            SkinName = item.Skin?.Name ?? "Unknown",
            MarketHashName = item.SteamMarketHashName?.Trim()
                ?? item.Skin?.MarketHashName?.Trim()
                ?? item.Skin?.Name,
            Rarity = item.Skin?.Rarity ?? "Unknown",
            Type = item.Skin?.Type ?? "Unknown",
            Collection = item.Skin?.Collection,
            Weapon = item.Skin?.Weapon,
            Float = item.Float,
            Exterior = item.Exterior,
            PaintSeed = item.PaintSeed,
            Price = item.Price,
            Cost = item.Cost,
            PriceExceedsSteamLimit = item.Price > 2000m,
            ImageUrl = item.ImageUrl ?? item.Skin?.ImageUrl,
            TradeProtected = item.TradeProtected,
            TradableAfter = item.TradableAfter,
            AcquiredAt = item.AcquiredAt,
            PaintIndex = item.Skin?.PaintIndex,
            Stickers = item.Stickers.Select(s => new StickerDto
            {
                Id = s.Id,
                Name = s.Name,
                Price = s.Price,
                Slot = s.Slot,
                ImageUrl = s.ImageUrl
            }).ToList()
        };
    }

    public async Task<BulkImportInventoryResult> ImportInventoryFromCsvAsync(int userId, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("No file uploaded", nameof(file));
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {userId} not found");
        }

        var results = new BulkImportInventoryResult
        {
            UserId = userId,
            TotalRequested = 0,
            SuccessCount = 0,
            FailedCount = 0,
            Errors = new List<string>()
        };

        using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
        var csvContent = await reader.ReadToEndAsync();
        var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        var allSkins = await _context.Skins.ToListAsync();

        int lineNumber = 0;
        foreach (var line in lines)
        {
            lineNumber++;
            var trimmedLine = line.Trim();

            if (string.IsNullOrWhiteSpace(trimmedLine) ||
                trimmedLine.StartsWith("Golds", StringComparison.OrdinalIgnoreCase) ||
                trimmedLine.StartsWith("Gloves", StringComparison.OrdinalIgnoreCase) ||
                trimmedLine.StartsWith("Knifes", StringComparison.OrdinalIgnoreCase) ||
                trimmedLine.StartsWith("Agents", StringComparison.OrdinalIgnoreCase) ||
                trimmedLine.StartsWith("Coverts", StringComparison.OrdinalIgnoreCase) ||
                trimmedLine.StartsWith("Weapons", StringComparison.OrdinalIgnoreCase) ||
                trimmedLine.All(c => c == '\t' || c == ' ' || char.IsDigit(c) || c == '-' || c == '.'))
            {
                continue;
            }

            try
            {
                var parts = trimmedLine
                    .Split(new[] { '\t', ',' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(p => p.Trim())
                    .Where(p => !string.IsNullOrWhiteSpace(p))
                    .ToArray();

                if (parts.Length < 3)
                {
                    results.FailedCount++;
                    results.Errors.Add($"Line {lineNumber}: Not enough columns (need at least Name, Price, Cost)");
                    continue;
                }

                var skinName = parts[0];

                double floatValue = 0.0;
                int priceIndex = 1;
                int costIndex = 2;

                if (parts.Length > 1 && double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedFloat))
                {
                    floatValue = parsedFloat;
                    priceIndex = 2;
                    costIndex = 3;
                }

                if (parts.Length <= priceIndex || !decimal.TryParse(parts[priceIndex], NumberStyles.Currency | NumberStyles.Float, CultureInfo.InvariantCulture, out var price))
                {
                    results.FailedCount++;
                    results.Errors.Add($"Line {lineNumber}: Invalid price for '{skinName}'");
                    continue;
                }

                decimal? cost = null;
                if (parts.Length > costIndex && decimal.TryParse(parts[costIndex], NumberStyles.Currency | NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedCost))
                {
                    cost = parsedCost;
                }

                var skin = FindMatchingSkin(allSkins, skinName);
                if (skin == null)
                {
                    results.FailedCount++;
                    results.Errors.Add($"Line {lineNumber}: Skin not found: '{skinName}'");
                    continue;
                }

                var inventoryItem = new InventoryItem
                {
                    UserId = userId,
                    SkinId = skin.Id,
                    Float = floatValue,
                    Exterior = GetExteriorFromFloat(floatValue),
                    Price = price,
                    Cost = cost,
                    TradeProtected = false,
                    AcquiredAt = DateTime.UtcNow
                };

                _context.InventoryItems.Add(inventoryItem);
                results.SuccessCount++;
                results.TotalRequested++;
            }
            catch (Exception ex)
            {
                results.FailedCount++;
                results.Errors.Add($"Line {lineNumber}: Error processing line - {ex.Message}");
                _logger.LogError(ex, "Error processing CSV line {LineNumber}", lineNumber);
            }
        }

        await _context.SaveChangesAsync();
        return results;
    }

    private static Skin? FindMatchingSkin(List<Skin> skins, string searchName)
    {
        var normalizedSearch = NormalizeSkinName(searchName);

        var exactMatch = skins.FirstOrDefault(s =>
            NormalizeSkinName(s.Name).Equals(normalizedSearch, StringComparison.OrdinalIgnoreCase));
        if (exactMatch != null) return exactMatch;

        var containsMatch = skins.FirstOrDefault(s =>
            NormalizeSkinName(s.Name).Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase) ||
            normalizedSearch.Contains(NormalizeSkinName(s.Name), StringComparison.OrdinalIgnoreCase));
        if (containsMatch != null) return containsMatch;

        var searchWords = normalizedSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var bestMatch = skins
            .Select(s => new { Skin = s, Score = CalculateMatchScore(NormalizeSkinName(s.Name), normalizedSearch, searchWords) })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .FirstOrDefault();

        return bestMatch?.Skin;
    }

    private static string NormalizeSkinName(string name)
    {
        return name
            .Replace("★", string.Empty)
            .Replace("|", string.Empty)
            .Replace("StatTrak™", "StatTrak")
            .Replace("StatTrak", string.Empty)
            .Trim()
            .Replace("  ", " ");
    }

    private static int CalculateMatchScore(string skinName, string searchName, string[] searchWords)
    {
        var score = 0;
        var normalizedSkin = NormalizeSkinName(skinName).ToLowerInvariant();

        foreach (var word in searchWords)
        {
            if (normalizedSkin.Contains(word.ToLowerInvariant()))
            {
                score += 10;
            }
        }

        if (normalizedSkin.Contains(searchName.ToLowerInvariant()))
        {
            score += 50;
        }

        return score;
    }

    private static string GetExteriorFromFloat(double floatValue)
    {
        return floatValue switch
        {
            >= 0 and <= 0.07 => "Factory New",
            > 0.07 and <= 0.15 => "Minimal Wear",
            > 0.15 and <= 0.38 => "Field-Tested",
            > 0.38 and <= 0.45 => "Well-Worn",
            > 0.45 and <= 1.0 => "Battle-Scarred",
            _ => "Field-Tested"
        };
    }

    /// <summary>
    /// Calculates tradableAfter date using Valve time
    /// Valve counts days from 9am GMT+1 (which is 8am UTC)
    /// </summary>
    private static DateTime CalculateValveTradeLockDate(int days)
    {
        var now = DateTime.UtcNow;
        
        // Find the next 8am UTC (9am GMT+1)
        var nextValveDay = new DateTime(now.Year, now.Month, now.Day, 8, 0, 0, DateTimeKind.Utc);
        
        // If we've already passed 8am UTC today, move to tomorrow
        if (now.Hour > 8 || (now.Hour == 8 && now.Minute > 0))
        {
            nextValveDay = nextValveDay.AddDays(1);
        }
        
        // Add the specified number of days
        return nextValveDay.AddDays(days);
    }
}


