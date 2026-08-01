using System.Collections.Concurrent;

namespace backend.Services;

public sealed class SteamRefreshStatusTracker
{
    private readonly ConcurrentDictionary<int, SteamRefreshStatus> _statuses = new();

    public SteamRefreshStatus Start(int userId)
    {
        var status = new SteamRefreshStatus
        {
            UserId = userId,
            IsActive = true,
            Phase = "fetching",
            TotalItems = 0,
            Imported = 0,
            Skipped = 0,
            Errors = 0,
            Message = "Starting Steam refresh",
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };

        _statuses[userId] = status;
        return status;
    }

    public void SetFetchingProgress(int userId, int pageCount, int totalFetchedAssets)
    {
        if (_statuses.TryGetValue(userId, out var status))
        {
            status.Phase = "fetching";
            status.Message = $"Fetched {totalFetchedAssets} assets across {pageCount} page{(pageCount == 1 ? "" : "s")}";
            status.UpdatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    public void SetImporting(int userId, int totalItems)
    {
        if (_statuses.TryGetValue(userId, out var status))
        {
            status.Phase = "importing";
            status.TotalItems = totalItems;
            status.Message = $"Importing {totalItems} items";
            status.UpdatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    public void UpdateImportProgress(int userId, int imported, int skipped, int errors)
    {
        if (_statuses.TryGetValue(userId, out var status))
        {
            status.Imported = imported;
            status.Skipped = skipped;
            status.Errors = errors;
            status.Phase = "importing";
            status.Message = $"Imported {imported} of {status.TotalItems}";
            status.UpdatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    public void Complete(int userId, int totalItems, int imported, int skipped, int errors)
    {
        if (_statuses.TryGetValue(userId, out var status))
        {
            status.IsActive = false;
            status.Phase = "completed";
            status.TotalItems = totalItems;
            status.Imported = imported;
            status.Skipped = skipped;
            status.Errors = errors;
            status.Message = "Steam refresh completed";
            status.UpdatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    public void Fail(int userId, string message)
    {
        if (_statuses.TryGetValue(userId, out var status))
        {
            status.IsActive = false;
            status.Phase = "failed";
            status.Message = message;
            status.UpdatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    public SteamRefreshStatus Get(int userId)
    {
        if (_statuses.TryGetValue(userId, out var status))
        {
            return status;
        }

        return new SteamRefreshStatus
        {
            UserId = userId,
            IsActive = false,
            Phase = "idle",
            Message = "No active Steam refresh",
            UpdatedAtUtc = DateTimeOffset.UtcNow
        };
    }
}

public sealed class SteamRefreshStatus
{
    public int UserId { get; set; }
    public bool IsActive { get; set; }
    public string Phase { get; set; } = "idle";
    public int TotalItems { get; set; }
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public int Errors { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAtUtc { get; set; }
}
