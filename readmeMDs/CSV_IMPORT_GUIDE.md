# CSV Import Guide

## Overview
You can import your inventory from Google Sheets (or any CSV file) directly into the app! This makes it easy to bulk add all your skins at once.

## How to Format Your CSV

### Required Format

Your CSV file should have the following columns (in order):

1. **Skin Name** (required) - The name of the skin
2. **Float** (optional) - The float value (0.0 to 1.0). Can be empty for items without floats (like agents)
3. **Price** (required) - Current market price
4. **Cost** (optional) - What you paid for it
5. **Profit** (optional) - Ignored, calculated automatically
6. **Profit %** (optional) - Ignored, calculated automatically

### Supported Separators
- **Tabs** (Google Sheets default when copying)
- **Commas** (standard CSV)

### Example Format

```
Skin Name	Float	Price	Cost
★ Sport Gloves | Pandora's Box	0.4619	4500	3232.66
★ Butterfly Knife | Doppler (Phase 4)	0.01	3500	4522
AK-47 | Fire Serpent	0.2216	1049	945
Vypa Sista of the Revolution | Guerrilla Warfare		80	55
```

Or with commas:
```
Skin Name,Float,Price,Cost
★ Sport Gloves | Pandora's Box,0.4619,4500,3232.66
★ Butterfly Knife | Doppler (Phase 4),0.01,3500,4522
```

### Notes

- **Category headers** (like "Gloves", "Knives", "Agents") are automatically skipped
- **Empty lines** are ignored
- **Float is optional** - If missing, defaults to 0.0
- **Cost is optional** - If missing, defaults to null
- **Skin name matching** is flexible - The system will try to match even if the name doesn't match exactly

## How to Export from Google Sheets

1. **Select your data** in Google Sheets
2. **Copy** (Cmd/Ctrl + C)
3. **Paste into a text editor** (like VS Code or Notepad)
4. **Save as `.csv`** file
5. **Or** use File → Download → Comma-separated values (.csv)

### Google Sheets Format Example

| Skin Name | Float | Price | Cost | Profit | Profit % |
|-----------|-------|-------|------|--------|----------|
| ★ Sport Gloves \| Pandora's Box | 0.4619 | 4500 | 3232.66 | 1267.34 | 39 |
| ★ Butterfly Knife \| Doppler (Phase 4) | 0.01 | 3500 | 4522 | -1022 | -23 |
| AK-47 \| Fire Serpent | 0.2216 | 1049 | 945 | 104 | 11 |

When exported, this becomes:
```
Skin Name,Float,Price,Cost,Profit,Profit %
★ Sport Gloves | Pandora's Box,0.4619,4500,3232.66,1267.34,39
★ Butterfly Knife | Doppler (Phase 4),0.01,3500,4522,-1022,-23
AK-47 | Fire Serpent,0.2216,1049,945,104,11
```

## How to Import

1. **Log in** with your Steam ID
2. Click the **"Import CSV"** button (green button next to "Add Skin")
3. **Select your CSV file**
4. Wait for the import to complete
5. You'll see a success message with:
   - ✅ Number of items imported
   - ⚠️ Number of items that failed (if any)
   - ❌ Error messages for failed items

## Common Issues

### "Skin not found: [name]"
- The skin name doesn't match any skin in the catalog
- **Solution**: Check the exact name in the app's search, or try a variation
- The system uses fuzzy matching, but very different names won't match

### "Invalid price"
- The price column couldn't be parsed
- **Solution**: Make sure prices are numbers (no currency symbols like $)

### "Not enough columns"
- The CSV doesn't have enough columns
- **Solution**: Make sure you have at least: Skin Name, Price, Cost

### Import button not showing
- You need to be logged in with Steam
- **Solution**: Log in first, then the import button will appear

## Tips

1. **Test with a small file first** - Import 2-3 items to make sure the format works
2. **Keep your original CSV** - In case you need to re-import or fix errors
3. **Check errors carefully** - The import will show which items failed and why
4. **Float values** - Must be between 0.0 and 1.0
5. **Price/Cost** - Can be decimals (e.g., 1049.50)

## Example CSV Template

Save this as `inventory_template.csv`:

```csv
Skin Name	Float	Price	Cost
★ Sport Gloves | Pandora's Box	0.4619	4500	3232.66
★ Butterfly Knife | Doppler (Phase 4)	0.01	3500	4522
AK-47 | Fire Serpent	0.2216	1049	945
MAC-10 | Neon Rider	0.1	115	9.65
```

## Need Help?

If you're having trouble:
1. Check the error messages in the import result
2. Verify your CSV format matches the examples above
3. Make sure you're logged in
4. Try importing a smaller subset first to test

