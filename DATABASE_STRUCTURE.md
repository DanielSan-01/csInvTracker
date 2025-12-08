# Database Structure for Stickers

## Entity Relationships

```
User (1) ──< (many) InventoryItem (1) ──< (many) Sticker
                │
                └──> (1) Skin (catalog entry)
```

## Explanation

1. **User** - The user account
   - Has many `InventoryItems` (the user's specific instances of skins)

2. **InventoryItem** - A user's specific instance of a skin
   - Belongs to a `User` (UserId)
   - References a `Skin` (SkinId) - the catalog entry
   - Has many `Stickers` - stickers attached to THIS specific instance
   - Contains user-specific data: Float, Price, Cost, etc.

3. **Skin** - The catalog/template entry
   - Shared across all users
   - Contains: Name, Rarity, Type, DefaultPrice, ImageUrl
   - Multiple users can have the same Skin, but each has their own InventoryItem

4. **Sticker** - Attached to a specific InventoryItem
   - Belongs to an `InventoryItem` (InventoryItemId)
   - Contains: Name, Price, Slot, ImageUrl
   - Each sticker is unique to that user's specific skin instance

## Example

**User 1** has:
- InventoryItem #17: "AK-47 | Fire Serpent" (float: 0.5, price: $100)
  - Sticker #1: "Crown (Foil)" on slot 1
  - Sticker #2: "Lotus (Glitter)" on slot 2

**User 2** has:
- InventoryItem #42: "AK-47 | Fire Serpent" (float: 0.1, price: $150)
  - Sticker #3: "Dragon Lore" on slot 1
  - (No other stickers)

Both users have the same **Skin** (AK-47 | Fire Serpent), but different **InventoryItems** with different stickers.

## Frontend Display

The frontend receives `InventoryItemDto` which includes:
- The Skin information (name, rarity, type, etc.)
- The InventoryItem data (float, price, cost, etc.)
- **The Stickers array** - attached to this specific InventoryItem

The frontend then displays:
- The skin image (from Skin or InventoryItem)
- The stickers below the image (from InventoryItem.Stickers)




