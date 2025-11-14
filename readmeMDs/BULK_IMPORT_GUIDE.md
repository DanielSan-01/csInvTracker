# Bulk Inventory Import Guide

## Overview
You can now bulk import inventory items from a JSON file! This is perfect for adding multiple skins at once.

## How It Works

1. **Test Coverage**: A test verifies that adding multiple skins works correctly for a logged-in user
2. **Bulk Import Endpoint**: `POST /api/admin/bulk-import-inventory`
3. **Fuzzy Matching**: The system automatically matches skin names even if they don't match exactly

## Steps to Import Your Inventory

### 1. Update the JSON File

Edit `backend/bulk_inventory_import.json` with your actual inventory data:

```json
{
  "userId": 1,
  "items": [
    {
      "skinName": "★ Sport Gloves | Pandora's Box",
      "float": 0.4679,
      "price": 4500,
      "cost": 3232.66,
      "tradeProtected": false
    },
    // ... add all your items
  ]
}
```

**Note**: Update the `userId` if needed (check with: `sqlite3 backend/csInvTracker.db "SELECT Id FROM Users WHERE SteamId = 'YOUR_STEAM_ID';"`)

### 2. Make Sure Backend is Running

```bash
cd backend
dotnet run
```

Wait for: `Now listening on: http://localhost:5027`

### 3. Run the Import Script

```bash
cd backend
./import_inventory.sh
```

Or specify a custom JSON file:
```bash
./import_inventory.sh my_custom_inventory.json
```

### 4. Check Results

The script will show:
- ✅ Success count
- ❌ Failed count  
- 📋 Any errors (skin names that couldn't be matched)

## Example Response

```json
{
  "userId": 1,
  "totalRequested": 33,
  "successCount": 30,
  "failedCount": 3,
  "errors": [
    "Skin not found: Some Custom Skin Name",
    "Skin not found: Another Missing Skin"
  ]
}
```

## Fuzzy Matching

The system will try to match skin names even if they don't match exactly:
- Removes `★`, `|`, `StatTrak™` symbols
- Case-insensitive matching
- Partial word matching
- Best match scoring

## Testing

Run the test to verify bulk adding works:
```bash
cd backend
dotnet test --filter "FullyQualifiedName~CreateInventoryItem_BulkAdd"
```

## Troubleshooting

**"User with ID X not found"**
- Check your user ID: `sqlite3 backend/csInvTracker.db "SELECT * FROM Users;"`
- Update `userId` in the JSON file

**"Skin not found: [name]"**
- The skin might not be in the catalog
- Try a different name variation
- Check available skins: `sqlite3 backend/csInvTracker.db "SELECT Name FROM Skins WHERE Name LIKE '%PARTIAL_NAME%';"`

**Backend not responding**
- Make sure backend is running: `cd backend && dotnet run`
- Check it's listening on port 5027

