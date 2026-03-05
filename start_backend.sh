#!/bin/bash

# Start the CS Inv Tracker Backend
# Usage: ./start_backend.sh

cd "$(dirname "$0")/backend" || exit 1

echo "🚀 Starting CS Inv Tracker Backend..."
echo "📦 Restoring packages..."
dotnet restore

echo ""
echo "▶️  Starting server..."
echo "   Listening on: http://localhost:5027"
echo ""
echo "Press Ctrl+C to stop"
echo ""

dotnet run

