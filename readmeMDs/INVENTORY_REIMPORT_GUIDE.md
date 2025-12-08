# Inventory Reset & Re-Import Guide (December 2025)

We cleared every inventory item in the production database so the new Steam-market pricing flow can populate fresh data. Use the steps below to repopulate inventories and handle ultra-high-value skins.

## What changed
- The backend now pulls live prices from Steam during import, and flags anything above Steam’s ~$2,000 wallet cap.
- CI runs the Steam-market integration test (`SteamApiServiceTests`) whenever the `STEAM_API_KEY` secret is present. Without the secret the workflow skips that test automatically.

## One-time admin tasks
1. **Set the GitHub secret**  
   - Go to *Settings → Secrets and variables → Actions*.  
   - Add `STEAM_API_KEY` with a valid WebAPI key.  
   - The `backend-tests` workflow will start running the full suite, including the Steam integration check.

2. **Confirm inventory wipe**  
   - Endpoint called: `DELETE https://csinvtracker-test1.up.railway.app/api/admin/inventory`.  
   - All `InventoryItems` and associated `Stickers` were removed. Users now see an empty grid until they re-import.

## User re-import instructions
1. Visit `www.csinvtracker.com` and sign in via Steam as usual.
2. Open the inventory dashboard; the top banner will show “Refresh from Steam”.
3. Click **Refresh from Steam** to pull the latest inventory and market prices.
4. Watch for the yellow “Manual Price Overrides” banner:
   - Items above $2,000 (Steam wallet cap) or missing prices are listed there.
   - Click **Manual Price Overrides** to fill in those values manually.
5. Toast notifications confirm how many items imported and which ones still need manual input.

## Ongoing monitoring
- If the Steam Market endpoint or API key fails, the CI job will break and provide early warning.
- You can re-run the inventory clear script locally if needed:  
  `API_URL="https://csinvtracker-test1.up.railway.app/api" ./backend/clear_inventory.sh`

Ping the team if any user still sees stale data after performing the steps above.***

