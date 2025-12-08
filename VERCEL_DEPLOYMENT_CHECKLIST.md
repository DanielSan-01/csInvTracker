# Vercel Deployment Checklist

## Required Environment Variables

Your Vercel deployment **MUST** have these environment variables set:

### 1. `NEXT_PUBLIC_API_URL`
- **Value**: Your Railway backend API URL
- **Example**: `https://your-app.railway.app/api`
- **Where to set**: Vercel Dashboard → Your Project → Settings → Environment Variables

### 2. `NEXT_PUBLIC_BASE_URL`
- **Value**: Your Vercel frontend URL
- **Example**: `https://your-app.vercel.app` or `https://csinvtracker.com`
- **Where to set**: Vercel Dashboard → Your Project → Settings → Environment Variables

## How to Check/Set Environment Variables

1. Go to https://vercel.com/dashboard
2. Click on your `csInvTracker` project
3. Go to **Settings** → **Environment Variables**
4. Verify these variables exist:
   - `NEXT_PUBLIC_API_URL` = `https://your-railway-backend.railway.app/api`
   - `NEXT_PUBLIC_BASE_URL` = `https://your-vercel-app.vercel.app`

## If Variables Are Missing

1. Click **Add New** in Environment Variables
2. Add each variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your Railway backend URL (e.g., `https://cs-inv-tracker-production.railway.app/api`)
   - **Environment**: Select **Production**, **Preview**, and **Development**
3. Repeat for `NEXT_PUBLIC_BASE_URL`
4. **Redeploy** after adding variables (Vercel will auto-redeploy, or you can manually trigger)

## Common Issues

### Issue: Build succeeds but deployment fails
**Cause**: Missing `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BASE_URL`
**Fix**: Add the environment variables and redeploy

### Issue: "Error" status in Vercel dashboard
**Cause**: Runtime error when Next.js tries to start
**Fix**: 
1. Check the deployment logs (click on the failed deployment)
2. Look for error messages about missing env vars
3. Add missing variables and redeploy

### Issue: Features don't work after deployment
**Cause**: 
- Environment variables not set correctly
- Browser cache showing old version
**Fix**:
1. Verify env vars are set
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors (F12)

## Verification Steps

After setting environment variables:

1. **Trigger a new deployment** (push a commit or manually redeploy)
2. **Wait for deployment to complete** (should show "Ready" not "Error")
3. **Visit your site** and check:
   - Does the page load?
   - Open browser console (F12) - are there any errors?
   - Try logging in - does it work?
   - Check if "Add Price to Items" button is visible

## Quick Test

To verify your environment variables are set correctly:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. You should see:
   ```
   NEXT_PUBLIC_API_URL = https://your-backend.railway.app/api
   NEXT_PUBLIC_BASE_URL = https://your-frontend.vercel.app
   ```

If either is missing, add it and redeploy!

