# Steam API Integration

## Summary

This application uses **Steam API exclusively** for all skin catalog data.

### Steam Inventory API

We use the **Steam Community Inventory API** to:
1. Fetch user inventories: `https://steamcommunity.com/inventory/{steamId}/730/2`
2. Extract unique items from all user inventories
3. Build and maintain the skin catalog from real Steam data

### Catalog Refresh Process

The catalog is populated and refreshed using `SteamCatalogRefreshService`:
- Fetches inventories from all users in the system
- Extracts unique items by `market_hash_name`
- Creates/updates skins in the database with:
  - Name (from Steam's `market_hash_name`)
  - Images (from Steam's CDN)
  - Rarity, type, weapon (extracted from Steam tags)
  - Collection information
  - Paint indices for Doppler phases

### Benefits of Using Steam API

1. **Always up-to-date**: Data comes directly from Steam
2. **Accurate images**: Uses Steam's official CDN images
3. **Exact matching**: Uses Steam's `market_hash_name` for precise matching
4. **No external dependencies**: No reliance on third-party APIs
5. **Real inventory data**: Catalog reflects what users actually have

### How to Refresh the Catalog

Use the admin endpoint to refresh from Steam:
```bash
POST /api/admin/refresh-from-steam
```

This will:
- Fetch inventories from all users with Steam IDs
- Extract unique items
- Update the catalog with latest Steam data
- Update images to latest versions from Steam CDN
