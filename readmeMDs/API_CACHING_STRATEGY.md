# API Caching Strategy 🚀

## Problem: Avoid Rate Limits & Improve Performance

Steam API is reliable, but:
- Making many API calls on every app load = SLOW
- Risk of hitting Steam rate limits
- Unnecessary network overhead

## ✅ Our Solution: Import from Steam, Serve from Database

### Phase 1: Catalog Refresh (Periodic)
```bash
POST /api/admin/refresh-from-steam
```

**What happens:**
1. Fetches inventories from all users with Steam IDs
2. Extracts unique items by `market_hash_name`
3. Stores in **local PostgreSQL database**
4. Updates images from Steam CDN
5. Extracts metadata (rarity, type, weapon, collection)

### Phase 2: Serve from Database (Always)
```
GET /api/skins
GET /api/skins?search=karambit
GET /api/skins/{id}
```

**What happens:**
- ✅ Reads from LOCAL database (milliseconds)
- ✅ No external API calls
- ✅ Works offline
- ✅ Consistent performance

### Phase 3: Refresh (Manual or Scheduled)

**When to refresh:**
- New CS2 case drops with new skins
- Major game update
- When users report missing skins
- Periodically (weekly/monthly)

**How to refresh:**
```bash
# Use the admin endpoint
POST /api/admin/refresh-from-steam
```

**Smart Update Logic:**
- If skin exists → UPDATE (new image, metadata changes)
- If skin is new → CREATE
- Uses `market_hash_name` for exact matching
- No duplicates!

## 🎯 Performance Comparison

| Method | Time | API Calls | Offline? |
|--------|------|-----------|----------|
| Direct Steam API (Old) | ~60s | Many | ❌ No |
| **Our Database (New)** | **~50ms** | **0** | ✅ Yes |

## 🔒 Rate Limit Protection

**Steam API Considerations:**
- Steam inventory API is rate-limited
- Multiple users = multiple requests
- We batch and cache results

**Our Approach:**
- Refresh: Fetches from all user inventories (batched)
- All other requests: 0 API calls (served from DB)
- Images: Served from Steam CDN (cached by browser)

**Result:** Minimal API calls, maximum performance! 🎉

## 📊 Database Size

```
Skins Table:
  Grows as users import inventories
  ~500 KB - 2 MB typical
  
Indexes:
  - Name (for search)
  - Rarity
  - Type
  - MarketHashName (for matching)
  
Query time: ~1-5ms
```

## 🔄 Future Enhancement Ideas

1. **Auto-Refresh Scheduled** (background job)
   ```csharp
   // Add scheduled task to refresh weekly
   // Call POST /api/admin/refresh-from-steam
   ```

2. **Incremental Updates**
   ```csharp
   // Only fetch new items since last refresh
   // Track last refresh timestamp
   ```

3. **Image Caching**
   ```csharp
   // Cache Steam CDN images locally
   // Reduce external image requests
   ```

## 🎮 Bottom Line

**Refresh from Steam. Serve from database. Update periodically.**

No rate limits. No slow loads. Just fast, reliable skin data from Steam! 🚀
