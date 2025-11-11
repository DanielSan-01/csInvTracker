#!/bin/bash

echo "🧹 Cleaning up redundant files..."
echo ""

# Root level - Big JSON files we don't need anymore
echo "📦 Removing old JSON files..."
rm -f all_skins.json
rm -f all_skins.jsonument
rm -f sample_50_skins.json

# Root level - Redundant documentation
echo "📄 Removing redundant documentation..."
rm -f BACKEND_SETUP_COMPLETE.md
rm -f BEGINNER_GUIDE.md
rm -f CSFLOAT_IMPORT_GUIDE.md
rm -f FRONTEND_BACKEND_INTEGRATION.md
rm -f FULL_STACK_READY.md
rm -f HOW_TO_IMPORT_SKINS.md
rm -f IMPORT_SKINS_README.md
rm -f INTEGRATION_COMPLETE_SUMMARY.md
rm -f INTEGRATION_SUMMARY.md
rm -f QUICK_START_IMPORT.md
rm -f READY_TO_IMPORT.md
rm -f SKIN_IMPORT_COMPLETE.md
rm -f SORTING_FILTERING_GUIDE.md
rm -f STEAM_IMAGES_GUIDE.md
rm -f TEST_BACKEND_SEARCH.md
rm -f TEST_IT_NOW.md
rm -f TESTING_BACKEND.md

# Backend - Unused services
echo "🔧 Removing unused backend files..."
rm -f backend/Services/CSFloatService.cs
rm -f backend/Data/SkinDataImporter.cs

# Frontend - Test/unused files
echo "⚛️  Removing unused frontend files..."
rm -f frontend/app/api/csfloat/route.ts
rm -f frontend/app/api/steam-image-test/route.ts
rm -rf frontend/app/csfloat-test
rm -f frontend/app/components/GSAPExample.tsx
rm -f frontend/lib/fetchSteamImages.js
rm -f frontend/lib/steamImages.ts

# Scripts
echo "📜 Removing old scripts..."
rm -f import_csfloat.sh

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Keeping these essential docs:"
echo "  • README.md - Main project documentation"
echo "  • PROJECT_PLAN.md - Project roadmap"
echo "  • API_CACHING_STRATEGY.md - Technical strategy doc"
echo ""
echo "📋 Keeping these essential scripts:"
echo "  • import_bymykel.sh - Active import script"
echo ""

