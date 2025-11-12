#!/bin/bash

# Bulk import inventory items from JSON file
# Usage: ./import_inventory.sh [json_file]

JSON_FILE="${1:-bulk_inventory_import.json}"
API_URL="http://localhost:5027/api/admin/bulk-import-inventory"

echo "🚀 Starting bulk inventory import..."
echo "📄 Using file: $JSON_FILE"
echo ""

# Check if file exists
if [ ! -f "$JSON_FILE" ]; then
    echo "❌ Error: File $JSON_FILE not found!"
    exit 1
fi

# Check if backend is running
if ! curl -s "$API_URL" > /dev/null 2>&1; then
    echo "⚠️  Warning: Backend might not be running at $API_URL"
    echo "   Make sure the backend is started with: cd backend && dotnet run"
    echo ""
fi

# Make the API call
echo "📤 Sending request to backend..."
RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d @"$JSON_FILE")

# Check if curl was successful
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to connect to backend API"
    echo "   Make sure the backend is running at http://localhost:5027"
    exit 1
fi

# Pretty print the response
echo ""
echo "📊 Import Results:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check for errors in response
if echo "$RESPONSE" | grep -q '"failedCount":[1-9]'; then
    echo "⚠️  Some items failed to import. Check the errors above."
    exit 1
elif echo "$RESPONSE" | grep -q '"successCount":0'; then
    echo "❌ No items were imported. Check the errors above."
    exit 1
else
    echo "✅ Import completed successfully!"
fi

