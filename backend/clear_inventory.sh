#!/usr/bin/env bash

set -euo pipefail

API_URL="${API_URL:-http://localhost:5027/api}"

echo "Clearing all inventory items via ${API_URL}/admin/inventory ..."

response=$(curl -sS -X DELETE "${API_URL}/admin/inventory" \
  -H "Content-Type: application/json")

echo "Response:"
echo "${response}"

