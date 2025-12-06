# 🔍 Search Shortcuts & Enhanced Search Guide

## What's New?

Your CS Inventory Tracker now has **TWO search systems**:

1. **Global Search** (Top bar) - Search ALL 2,500+ skins with shortcuts
2. **Inventory Filter** (Below) - Filter only YOUR items

---

## 🚀 Quick Search Shortcuts

### Weapon Shortcuts

| Type | Shortcut | Expands To |
|------|----------|------------|
| **Knives** | `bfk` | Butterfly Knife |
| | `kara` | Karambit |
| | `m9` | M9 Bayonet |
| | `bayo` | Bayonet |
| **Rifles** | `ak` | AK-47 |
| | `m4` | M4A4 |
| | `awp` | AWP |
| **Pistols** | `deag` | Desert Eagle |
| | `usp` | USP-S |
| | `57` | Five-SeveN |

### Skin Shortcuts

| Type | Shortcut | Expands To |
|------|----------|------------|
| **Doppler** | `ph1`, `ph2`, `ph3`, `ph4` | Phase 1-4 |
| | `p1`, `p2`, `p3`, `p4` | Phase 1-4 |
| | `ruby` | Ruby |
| | `sapphire` | Sapphire |
| | `bp` | Black Pearl |
| **Gamma** | `gamma` | Gamma Doppler |
| | `gamma1`, `gamma2`, etc. | Gamma Phases |
| **Popular** | `dlore` | Dragon Lore |
| | `howl` | Howl |
| | `redline` | Redline |
| | `asiimov` | Asiimov |
| | `fade` | Fade |
| | `marble` | Marble Fade |
| | `tiger` | Tiger Tooth |
| | `cw` | Crimson Web |

### Wear Shortcuts

| Shortcut | Expands To |
|----------|------------|
| `fn` | Factory New |
| `mw` | Minimal Wear |
| `ft` | Field-Tested |
| `ww` | Well-Worn |
| `bs` | Battle-Scarred |

---

## 📝 Example Searches

### Basic Search
```
butterfly doppler
```
✅ Finds: "★ Butterfly Knife | Doppler"

### With Shortcuts
```
bfk doppler ph4
```
✅ Expands to: "Butterfly Doppler Phase 4"
✅ Finds: All Butterfly Knife Dopplers, prioritizing Phase 4

### Multiple Shortcuts
```
kara fade fn
```
✅ Expands to: "Karambit Fade Factory New"
✅ Finds: Karambit Fade skins, prioritizing Factory New

### Popular Combos
```
ak redline
```
✅ Finds: "AK-47 | Redline"

```
awp dlore
```
✅ Expands to: "AWP Dragon Lore"
✅ Finds: "AWP | Dragon Lore"

```
m9 tiger
```
✅ Expands to: "M9 Bayonet Tiger Tooth"
✅ Finds: "★ M9 Bayonet | Tiger Tooth"

---

## 🎯 How It Works

### 1. **Fuzzy Matching**
Search is now more forgiving:
- Partial matches work: `"butter"` → Butterfly
- Ignores special characters: `"ak47"` = `"ak-47"`
- Case insensitive: `"KARAMBIT"` = `"karambit"`

### 2. **Shorthand Expansion**
Your search terms automatically expand:
```
Input: "bfk doppler ph4"
      ↓
Expands: ["bfk doppler ph4", "Butterfly Doppler Phase 4", "Butterfly doppler ph4"]
      ↓
Searches: All expanded terms
      ↓
Results: Sorted by relevance
```

### 3. **Smart Scoring**
Results are ranked:
1. **Exact match** (1000 points) - `"Karambit"` for search "karambit"
2. **Starts with** (500 points) - `"Karambit Fade"` for search "kara"
3. **Contains** (100 points) - `"M9 Bayonet | Doppler"` for search "doppler"
4. **Fuzzy match** (50 points) - `"Butterfly Knife"` for search "bfk"

---

## 🔥 Pro Tips

### Combine Multiple Shortcuts
```
Search: "bfk gamma p2"
Finds: Butterfly Knife Gamma Doppler Phase 2
```

### Quick Add Workflow
1. Type `"kara fade"` in global search
2. Click **"+ Add"** button next to any result
3. Form opens pre-filled with that skin
4. Just add float, price, cost → Done!

### Inventory Filter
Use the smaller search bar below to filter only YOUR items:
```
Global Search: "awp" → Shows all AWP skins (2,500+ catalog)
Inventory Filter: "awp" → Shows only YOUR AWP skins
```

---

## 🛠️ Technical Details

### Files Changed
- `frontend/lib/searchShorthands.ts` - Shorthand mappings
- `frontend/hooks/useSkinCatalog.ts` - Search expansion logic
- `frontend/app/components/GlobalSearchBar.tsx` - New global search UI
- `frontend/app/components/ItemGrid.tsx` - Integrated both search bars

### Performance
- **Debounced**: Waits 300ms after you stop typing
- **Limited Results**: Top 50 most relevant matches
- **Deduplication**: No duplicate skins in results
- **Cached**: Backend stores all skins in database

---

## 🎨 UI/UX Changes

### Before
- Single search bar (only filtered your inventory)
- Had to know exact skin names
- "butterfly doppler" wouldn't find "★ Butterfly Knife | Doppler"

### After
- **Global Search** (top, large) - Search all skins, add from results
- **Inventory Filter** (below, small) - Filter your collection
- Shortcuts work everywhere: `"bfk ph4"` → success!
- Real-time results with images and rarity colors
- "Already in inventory" badge prevents duplicates

---

## 📊 Example Use Cases

### Use Case 1: Adding a New Knife
1. Type `"kara doppler ph4"` in global search
2. See: "★ Karambit | Doppler (Phase 4)" with image
3. Click **"+ Add"**
4. Form opens with Karambit Doppler pre-selected
5. Enter float: `0.008`, price: `$850`
6. Click Save → Added to inventory!

### Use Case 2: Checking Market Prices
1. Type `"m9 tiger"` in global search
2. Browse all M9 Bayonet Tiger Tooth results
3. See default prices from Steam market data
4. If you own one, shows **"✓ In Inventory"**
5. If not, click **"+ Add"** to add it

### Use Case 3: Finding That One Skin
1. Type `"cw fn"` in global search
2. See ALL Crimson Web Factory New skins (knives, gloves, etc.)
3. Sorted by relevance
4. Click **"+ Add"** on the one you want

---

## 🚀 Future Enhancements (Ideas for Later)

- [ ] Save favorite shortcuts
- [ ] Recent searches history
- [ ] Price comparison (your inventory vs. market)
- [ ] Collection-based search (e.g., "Chroma 3 Case skins")
- [ ] Multi-select add (add multiple skins at once)

---

## 💬 Feedback

Try these example searches:
- `bfk fade`
- `kara tiger`
- `ak fire`
- `awp asiimov`
- `m9 ruby`
- `deag blaze`

**Did it work as expected? Any shortcuts you'd like to add?**

Let me know if you want more weapon types, skin patterns, or wear shortcuts!

