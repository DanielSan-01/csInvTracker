# Testing Your Backend API 🧪

## Method 1: Swagger UI (Easiest - No Coding!)

### What is Swagger UI?
Swagger UI is an **interactive API documentation tool** that automatically generates a web interface for your API. Think of it as a playground where you can:
- 📖 Read API documentation
- 🎮 Test endpoints with real data
- 👀 See live request/response examples
- ✅ Verify everything works before connecting your frontend

### How to Use Swagger:

1. **Start your backend:**
   ```bash
   cd backend
   dotnet run
   ```
   
   You should see:
   ```
   Now listening on: http://localhost:5027
   ```

2. **Open Swagger UI in your browser:**
   ```
   http://localhost:5027/swagger
   ```

3. **Test the API:**

   **Example: Get All Skins**
   - Find the section **GET /api/skins**
   - Click the row to expand it
   - Click **"Try it out"** button
   - Click **"Execute"** button
   - Scroll down to see the Response:
     ```json
     [
       {
         "id": 1,
         "name": "Sport Gloves | Pandora's Box",
         "rarity": "Extraordinary",
         "type": "Gloves",
         "imageUrl": "...",
         "defaultPrice": 4500.0
       },
       ...19 items total
     ]
     ```

   **Example: Add Item to Inventory**
   - Find **POST /api/inventory**
   - Click **"Try it out"**
   - Edit the JSON in the Request body:
     ```json
     {
       "skinId": 2,
       "float": 0.565,
       "price": 680,
       "cost": 429,
       "tradeProtected": false
     }
     ```
   - Click **"Execute"**
   - See the created item with auto-calculated exterior!

   **Example: Search for Gloves**
   - Find **GET /api/skins**
   - Click **"Try it out"**
   - In the `search` parameter field, type: `Gloves`
   - Click **"Execute"**
   - See only the 4 gloves returned!

## Method 2: Browser (Simple GET Requests)

Just open these URLs in your browser:

- **All Skins:** http://localhost:5027/api/skins
- **Search Gloves:** http://localhost:5027/api/skins?search=Gloves
- **Get Inventory:** http://localhost:5027/api/inventory

You'll see raw JSON data. Install a browser extension like "JSON Formatter" for prettier display.

## Method 3: cURL (Terminal)

```bash
# Get all skins
curl http://localhost:5027/api/skins

# Get all skins (pretty printed)
curl -s http://localhost:5027/api/skins | python3 -m json.tool

# Search for knives
curl -s "http://localhost:5027/api/skins?search=Knife" | python3 -m json.tool

# Add an item
curl -X POST http://localhost:5027/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "skinId": 1,
    "float": 0.46,
    "price": 4500,
    "cost": 3232.66,
    "tradeProtected": true
  }'

# Get inventory
curl http://localhost:5027/api/inventory

# Update an item (change ID to match yours)
curl -X PUT http://localhost:5027/api/inventory/1 \
  -H "Content-Type: application/json" \
  -d '{
    "float": 0.46,
    "price": 4600,
    "cost": 3232.66,
    "tradeProtected": false
  }'

# Delete an item
curl -X DELETE http://localhost:5027/api/inventory/1
```

## Method 4: From Your Frontend (Next Step)

Once you verify the backend works, connect your Next.js frontend:

```typescript
import { inventoryApi, skinsApi } from '@/lib/api';

// Load skins
const skins = await skinsApi.getAll();
console.log('Skins:', skins);

// Load inventory
const items = await inventoryApi.getAll();
console.log('Inventory:', items);

// Add item
const newItem = await inventoryApi.create({
  skinId: 1,
  float: 0.46,
  price: 4500,
  cost: 3232.66,
  tradeProtected: false
});
```

## What to Verify:

### ✅ GET /api/skins
- Should return 19 skins
- Each skin has: id, name, rarity, type, imageUrl, defaultPrice
- Categories: Gloves (4), Knives (4), Rifles (3), Pistols (3), SMGs (2), Agents (2), Sniper Rifle (1)

### ✅ GET /api/skins?search=X
- Search for "Gloves" → 4 results
- Search for "AK-47" → 2 results (Fire Serpent, Head Shot)
- Search for "Knife" → 4 results

### ✅ POST /api/inventory
- Creates new inventory item
- Auto-calculates exterior from float:
  - 0.00-0.07 → Factory New
  - 0.07-0.15 → Minimal Wear
  - 0.15-0.38 → Field-Tested
  - 0.38-0.45 → Well-Worn
  - 0.45-1.00 → Battle-Scarred
- If `tradeProtected: true`, sets `tradableAfter` to 7 days from now
- Returns complete item with skin name, rarity, type from the Skins table

### ✅ GET /api/inventory
- Returns all your inventory items
- Each item includes skin details (name, rarity, type)
- Sorted by most recently acquired

### ✅ PUT /api/inventory/{id}
- Updates an existing item
- Can change price, cost, float, trade protection
- Re-calculates exterior if float changes
- Handles trade protection logic (sets 7-day lock if newly protected)

### ✅ DELETE /api/inventory/{id}
- Removes item from inventory
- Returns HTTP 204 (No Content) on success

## Database Location

Your data is stored in:
```
/Users/danielostensen/commonplace/csInvTracker/backend/csInvTracker.db
```

You can view it with:
- **DB Browser for SQLite** (free app)
- **VS Code extension**: "SQLite Viewer"
- Command line: `sqlite3 backend/csInvTracker.db`

## Common Issues

**Problem:** Can't access http://localhost:5027
- **Solution:** Make sure backend is running (`cd backend && dotnet run`)

**Problem:** CORS errors when calling from frontend
- **Solution:** Backend already configured for `http://localhost:3000`. Make sure your Next.js app runs on that port.

**Problem:** "Connection refused"
- **Solution:** Check that port 5027 isn't blocked or used by another app

**Problem:** Empty inventory even after adding items
- **Solution:** Check the database file exists and has data. Try adding an item via Swagger UI to verify.

## Next Steps

Once you verify the backend works:

1. Create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5027/api
   ```

2. Update `ItemGrid.tsx` to fetch from API instead of localStorage

3. Your frontend will show real data from the database! 🎉

