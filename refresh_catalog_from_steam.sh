#!/bin/bash

# Script to refresh the catalog from Steam inventories
# This will:
# 1. Fetch items from all user Steam inventories
# 2. Update existing skins with MarketHashName and latest images
# 3. Create new skins for items not in catalog
# 4. Update images from Steam (always up-to-date)

echo "🔄 Starting Steam Catalog Refresh..."
echo "This will fetch items from user inventories and update the catalog with:"
echo "  - MarketHashName (for accurate matching)"
echo "  - Latest images from Steam"
echo "  - Updated metadata (rarity, type, weapon, etc.)"
echo ""

# Default backend URL (can be overridden with BACKEND_URL env var)
BACKEND_URL="${BACKEND_URL:-http://localhost:5027}"

echo "📡 Calling backend API: ${BACKEND_URL}/api/admin/refresh-from-steam"
echo ""

# Make the API call
response=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/admin/refresh-from-steam" \
  -H "Content-Type: application/json")

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)
# Extract response body (all but last line)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo ""

if [ "$http_code" -eq 200 ]; then
  echo "✅ Catalog refresh successful!"
  echo ""
  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
  echo "❌ Catalog refresh failed!"
  echo ""
  echo "Error response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  exit 1
fi

echo ""
echo "📝 Next steps:"
echo "  1. The catalog now has MarketHashName populated for accurate matching"
echo "  2. Images have been updated from Steam"
echo "  3. Users can now refresh their inventories - matching will be exact!"
echo ""

