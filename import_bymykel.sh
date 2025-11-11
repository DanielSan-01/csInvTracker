#!/bin/bash

echo "🎮 Starting ByMykel CS:GO API Import..."
echo ""
echo "This will import:"
echo "  • ~2,013 Weapon Skins with images"
echo "  • ~50+ Knives with images"  
echo "  • ~40+ Gloves with images"
echo ""
echo "Total: ~2,100+ items with real Steam CDN images!"
echo ""

curl -X POST http://localhost:5027/api/admin/import-from-bymykel \
  -H "Content-Type: application/json" \
  2>&1 | python3 -m json.tool

echo ""
echo "✅ Import complete! Check your database."
echo ""
echo "Next steps:"
echo "  1. Check http://localhost:5027/api/admin/skin-stats to see totals"
echo "  2. Search for items: http://localhost:5027/api/skins?search=karambit"
echo "  3. Try the frontend - items now have real images!"

