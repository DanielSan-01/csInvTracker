# Steam Integration Implementation Guide

## Overview
This document outlines the Steam integration implementation, including Steam OpenID authentication, user profile fetching, and CS2 inventory loading.

## Completed Features

### 1. Backend Steam API Service ✅
- **File**: `backend/Services/SteamApiService.cs`
- **Purpose**: Fetches user profile data from Steam Web API using `GetPlayerSummaries`
- **Features**:
  - Fetches player summary (display name, avatar URLs, profile URL)
  - Uses Steam API key from configuration
  - Handles errors gracefully

### 2. User Model Updates ✅
- **File**: `backend/Models/User.cs`
- **New Fields**:
  - `DisplayName` - User's Steam display name
  - `AvatarUrl` - 32x32px avatar URL
  - `AvatarMediumUrl` - 64x64px avatar URL
  - `AvatarFullUrl` - 184x184px avatar URL
  - `ProfileUrl` - Steam Community profile URL

### 3. Users Controller Updates ✅
- **File**: `backend/Controllers/UsersController.cs`
- **Changes**:
  - Integrated `SteamApiService` to fetch profile data
  - Automatically fetches and stores Steam profile when user logs in
  - Updates existing user profiles on login

### 4. Frontend User Interface Updates ✅
- **File**: `frontend/lib/api.ts`
  - Updated `User` interface to include new profile fields
- **File**: `frontend/app/components/SteamLoginButton.tsx`
  - Uses proper Steam OpenID authentication (not just manual input)
  - Shows user avatar and display name when logged in
  - Uses Steam's official brand colors (#171a21, #1b2838, #66c0f4)
  - Falls back to manual input on localhost (OpenID doesn't work locally)

## Required Setup

### 1. Environment Variables

#### Backend (Railway)
Add the following environment variable:
```
STEAM_API_KEY=your_steam_api_key_here
```

Or configure in `appsettings.json`:
```json
{
  "Steam": {
    "ApiKey": "your_steam_api_key_here"
  }
}
```

#### Frontend (Vercel)
No new environment variables needed - Steam OpenID works with existing `NEXT_PUBLIC_BASE_URL`.

### 2. Database Migration

You need to create and apply a migration for the new User fields:

```bash
cd backend
dotnet ef migrations add AddUserProfileFields --context ApplicationDbContext
dotnet ef database update --context ApplicationDbContext
```

Or manually add the columns to your database:
```sql
ALTER TABLE "Users" ADD COLUMN "DisplayName" VARCHAR(255);
ALTER TABLE "Users" ADD COLUMN "AvatarUrl" VARCHAR(500);
ALTER TABLE "Users" ADD COLUMN "AvatarMediumUrl" VARCHAR(500);
ALTER TABLE "Users" ADD COLUMN "AvatarFullUrl" VARCHAR(500);
ALTER TABLE "Users" ADD COLUMN "ProfileUrl" VARCHAR(500);
```

## How It Works

### Authentication Flow

1. **User clicks "Sign in through Steam"**
   - On production: Redirects to Steam OpenID login
   - On localhost: Shows manual Steam ID input

2. **Steam OpenID Callback**
   - Steam redirects back to `/api/auth/steam/callback`
   - Callback extracts Steam ID from OpenID response
   - Redirects to main page with `steamId` query parameter

3. **User Context Refresh**
   - Frontend stores Steam ID in localStorage
   - Calls `GET /api/users/by-steam/{steamId}`
   - Backend fetches Steam profile via Steam Web API
   - Returns user data with avatar and display name

4. **UI Update**
   - `SteamLoginButton` displays user avatar and name
   - Avatar appears in top right corner of navbar

### Steam Web API Integration

The backend uses Steam's `GetPlayerSummaries` endpoint:
```
GET https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/
  ?key={STEAM_API_KEY}
  &steamids={STEAM_ID}
  &format=json
```

This returns:
- Display name (`personaname`)
- Avatar URLs (`avatar`, `avatarmedium`, `avatarfull`)
- Profile URL (`profileurl`)
- Online status, etc.

## Pending Features

### 1. Automatic CS2 Inventory Loading ⏳
**Status**: Partially implemented
**Location**: `frontend/app/components/ItemGrid.tsx` - `handleLoadFromSteam`

**Current State**:
- Function exists but only shows a "coming soon" message
- Steam inventory fetching works (`fetchSteamInventory`)

**To Complete**:
1. Create backend endpoint to import Steam inventory items
2. Match Steam items to skins in catalog by name/market_hash_name
3. Create inventory items via backend API
4. Handle items that don't exist in catalog (skip or create placeholder)
5. Add automatic loading when user first logs in

**Backend Endpoint Needed**:
```
POST /api/inventory/import-from-steam
Body: { steamId: string, items: ParsedSteamItem[] }
```

### 2. Steam Inventory Import Logic ⏳
**Requirements**:
- Parse Steam inventory items (already done in `steamApi.ts`)
- Match items to catalog skins by `market_hash_name`
- Extract float values, stickers, exterior from Steam descriptions
- Create `InventoryItem` records via backend API
- Handle duplicates (update existing or skip)

## Testing

### Local Development
1. Set `STEAM_API_KEY` in backend environment
2. Run backend: `dotnet run` (from `backend/` directory)
3. Run frontend: `npm run dev` (from `frontend/` directory)
4. On localhost, use manual Steam ID input
5. Verify avatar and display name appear after login

### Production
1. Set `STEAM_API_KEY` in Railway backend environment
2. Ensure `NEXT_PUBLIC_BASE_URL` is set in Vercel
3. Test Steam OpenID login flow
4. Verify profile data is fetched and displayed

## Steam Branding Guidelines

The login button uses Steam's official brand colors:
- Background: `#171a21` (Steam dark)
- Hover: `#1b2838` (Steam darker)
- Border/Text: `#66c0f4` (Steam blue)
- Button text: "Sign in through Steam"

## API Rate Limits

Steam Web API has a limit of **100,000 calls per day** per API key. The current implementation:
- Fetches profile once per login (not on every page load)
- Updates profile on each login (cached in database)
- Should be well within limits for normal usage

## Security Considerations

1. **Steam API Key**: Keep secret, never expose in frontend code
2. **OpenID Verification**: Currently simplified - should verify signature in production
3. **Session Management**: Currently uses localStorage - consider secure cookies for production
4. **CORS**: Backend should only allow requests from your frontend domain

## Next Steps

1. ✅ Complete database migration
2. ✅ Test Steam OpenID flow in production
3. ⏳ Implement automatic inventory import
4. ⏳ Add inventory import progress indicator
5. ⏳ Handle edge cases (private profiles, empty inventories, etc.)





