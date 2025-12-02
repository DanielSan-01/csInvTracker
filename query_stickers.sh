#!/bin/bash

# Script to query inventory items and their stickers from the database
# Usage: ./query_stickers.sh [item_id]
# Database: PostgreSQL (localhost:5432, database: csinvtracker, user: postgres, password: postgres)

if [ -z "$1" ]; then
    echo "=== All Inventory Items with Stickers ==="
    PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d csinvtracker <<EOF
SELECT 
    i."Id" as "ItemId",
    s."Name" as "SkinName",
    i."Float",
    i."Price",
    COUNT(st."Id") as "StickerCount",
    STRING_AGG(st."Name", ', ') as "StickerNames"
FROM "InventoryItems" i
LEFT JOIN "Skins" s ON i."SkinId" = s."Id"
LEFT JOIN "Stickers" st ON st."InventoryItemId" = i."Id"
GROUP BY i."Id", s."Name", i."Float", i."Price"
ORDER BY i."Id" DESC
LIMIT 20;
EOF
else
    echo "=== Inventory Item $1 Details ==="
    PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d csinvtracker <<EOF
SELECT 
    i."Id" as "ItemId",
    s."Name" as "SkinName",
    i."Float",
    i."Exterior",
    i."Price",
    i."Cost"
FROM "InventoryItems" i
LEFT JOIN "Skins" s ON i."SkinId" = s."Id"
WHERE i."Id" = $1;
EOF

    echo ""
    echo "=== Stickers for Item $1 ==="
    PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d csinvtracker <<EOF
SELECT 
    "Id",
    "Name",
    "Price",
    "Slot",
    "ImageUrl"
FROM "Stickers"
WHERE "InventoryItemId" = $1;
EOF
fi
