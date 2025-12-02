# Deployment Guide

## Backend Deployment (Railway)

### Step 1: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `csInvTracker` repository
4. Railway will detect the Dockerfile in the `backend/` folder
5. **Important**: Set the **Root Directory** to `backend` in Railway settings

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New" → "Database" → "Add PostgreSQL"
2. Railway will automatically create a PostgreSQL database
3. Copy the connection string from the database service

### Step 3: Configure Environment Variables

In Railway, go to your backend service → Variables tab, and add:

- `ConnectionStrings__DefaultConnection` = (the PostgreSQL connection string from step 2)
- `FRONTEND_URL` = `https://your-vercel-app.vercel.app` (your Vercel frontend URL)
- `ASPNETCORE_ENVIRONMENT` = `Production`

### Step 4: Get Your Backend URL

1. Once deployed, Railway will give you a URL like: `https://your-app.railway.app`
2. Your API will be available at: `https://your-app.railway.app/api`
3. **Copy this URL** - you'll need it for the frontend!

---

## Frontend Deployment (Vercel)

### Step 1: Configure Vercel Settings

In the Vercel deployment form:

1. **Framework Preset**: Change to "Next.js"
2. **Root Directory**: Set to `frontend`
3. **Build Command**: `npm run build` (default is fine)
4. **Output Directory**: `.next` (default is fine)

### Step 2: Add Environment Variables

In Vercel, add these environment variables:

- `NEXT_PUBLIC_API_URL` = `https://your-app.railway.app/api` (from Railway backend)
- `NEXT_PUBLIC_BASE_URL` = `https://your-vercel-app.vercel.app` (your Vercel URL)

### Step 3: Deploy

Click "Deploy" and wait for the build to complete!

---

## Alternative: Render.com

If you prefer Render over Railway:

1. Go to [render.com](https://render.com)
2. Create a new "Web Service" from your GitHub repo
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `dotnet publish -c Release -o ./publish`
   - **Start Command**: `dotnet ./publish/backend.dll`
4. Add PostgreSQL database from Render dashboard
5. Set environment variables (same as Railway)

---

## Testing Your Deployment

1. Backend should be accessible at: `https://your-backend-url.railway.app/api/health`
2. Frontend should load and connect to your backend
3. Check browser console for any CORS or API connection errors

---

## Troubleshooting

### CORS Errors
- Make sure `FRONTEND_URL` in backend matches your exact Vercel URL
- Check that CORS is configured correctly in `Program.cs`

### Database Connection Issues
- Verify the connection string is correct
- Make sure migrations run on startup (they should automatically)

### Build Failures
- Check Railway/Render logs for specific errors
- Ensure all NuGet packages are restored correctly

