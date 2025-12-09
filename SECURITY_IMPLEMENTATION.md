# Security Implementation Guide

## Overview
This document describes the security features implemented for Steam authentication, including OpenID signature verification, JWT token-based sessions, and secure cookie management.

## Implemented Security Features

### 1. OpenID Signature Verification ✅
**Location**: `backend/Services/OpenIdVerificationService.cs`

- **Purpose**: Verifies that OpenID responses from Steam are authentic and haven't been tampered with
- **How it works**:
  1. Validates OpenID response format (required parameters, Steam domain)
  2. Sends verification request to Steam's OpenID provider
  3. Steam responds with `is_valid:true` or `is_valid:false`
  4. Only proceeds with authentication if signature is valid

**Security Benefits**:
- Prevents replay attacks
- Ensures responses are from Steam, not malicious third parties
- Validates that the response hasn't been modified

### 2. JWT Token Authentication ✅
**Location**: `backend/Services/AuthService.cs`

- **Purpose**: Secure, stateless authentication using JSON Web Tokens
- **Features**:
  - Tokens expire after 30 days
  - Signed with HMAC-SHA256
  - Contains user ID and Steam ID claims
  - Validates issuer, audience, and expiration

**Configuration**:
- Secret key: `JWT_SECRET` environment variable (required in production)
- Issuer: `JWT_ISSUER` (default: "cs-inv-tracker")
- Audience: `JWT_AUDIENCE` (default: "cs-inv-tracker")

**Security Benefits**:
- Stateless authentication (no server-side session storage needed)
- Tamper-proof (signature verification)
- Time-limited (automatic expiration)

### 3. HTTP-Only Secure Cookies ✅
**Location**: `backend/Controllers/AuthController.cs`, `frontend/app/api/auth/steam/callback/route.ts`

- **Purpose**: Store authentication tokens securely in cookies
- **Cookie Settings**:
  - `HttpOnly: true` - Prevents JavaScript access (XSS protection)
  - `Secure: true` - Only sent over HTTPS in production
  - `SameSite: Lax` - CSRF protection
  - `Path: /` - Available site-wide
  - `Expires: 30 days` - Automatic expiration

**Security Benefits**:
- XSS protection (JavaScript cannot access token)
- CSRF protection (SameSite attribute)
- HTTPS-only in production (Secure flag)
- Automatic expiration

### 4. Session Verification Endpoint ✅
**Location**: `backend/Controllers/AuthController.cs` - `GET /api/auth/me`

- **Purpose**: Verify current session and return user data
- **How it works**:
  1. Extracts token from cookie or Authorization header
  2. Validates JWT token signature and expiration
  3. Returns user data if valid, 401 if invalid

**Security Benefits**:
- Allows frontend to verify session on page load
- Handles token expiration gracefully
- Supports both cookie and header-based authentication

## Authentication Flow

### Production Flow (Steam OpenID)

1. **User clicks "Sign in through Steam"**
   - Frontend redirects to Steam OpenID login page

2. **Steam Authentication**
   - User authenticates with Steam
   - Steam redirects back to `/api/auth/steam/callback` with OpenID response

3. **Backend Verification** (in callback route)
   - Frontend callback route sends OpenID params to `/api/auth/verify-openid`
   - Backend verifies signature with Steam
   - Backend extracts Steam ID

4. **Session Creation**
   - Frontend calls `/api/auth/login` with Steam ID
   - Backend creates/updates user in database
   - Backend generates JWT token
   - Backend sets secure HTTP-only cookie
   - Frontend redirects to main page

5. **Session Usage**
   - Frontend calls `/api/auth/me` to get current user
   - Token is automatically sent via cookie
   - Backend validates token and returns user data

### Localhost Flow (Manual Input)

1. **User enters Steam ID manually**
   - Only available on localhost (OpenID doesn't work locally)
   - Validates Steam ID format (17 digits)

2. **Direct Login**
   - Frontend calls `/api/auth/login` with Steam ID
   - Backend creates session (same as production)
   - Cookie is set (but Secure=false for localhost)

## Required Environment Variables

### Backend (Railway)

```bash
# Required for JWT token signing
JWT_SECRET=your-very-long-random-secret-key-here-minimum-64-characters

# Optional (defaults provided)
JWT_ISSUER=cs-inv-tracker
JWT_AUDIENCE=cs-inv-tracker

# Required for Steam profile fetching
STEAM_API_KEY=your-steam-api-key
```

**Generating JWT_SECRET**:
```bash
# Option 1: Use OpenSSL
openssl rand -base64 64

# Option 2: Use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Option 3: Use Python
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### Frontend (Vercel)

No new environment variables needed. Uses existing:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_BASE_URL` - Frontend URL for OpenID redirects

## Security Best Practices Implemented

### ✅ What We've Done

1. **OpenID Signature Verification**
   - All OpenID responses are verified with Steam
   - Prevents fake authentication responses

2. **Secure Token Storage**
   - Tokens stored in HTTP-only cookies
   - Cannot be accessed by JavaScript (XSS protection)

3. **HTTPS Enforcement**
   - Secure cookies only in production
   - Prevents token interception over HTTP

4. **Token Expiration**
   - Tokens expire after 30 days
   - Users must re-authenticate periodically

5. **CSRF Protection**
   - SameSite=Lax cookie attribute
   - Prevents cross-site request forgery

6. **Input Validation**
   - Steam ID format validation
   - OpenID parameter validation

### ⚠️ Additional Recommendations

1. **Rate Limiting**
   - Consider adding rate limiting to `/api/auth/login` endpoint
   - Prevents brute force attacks

2. **Token Refresh**
   - Consider implementing refresh tokens for longer sessions
   - Current implementation requires re-login after 30 days

3. **Audit Logging**
   - Log all authentication attempts (success and failure)
   - Monitor for suspicious activity

4. **IP Whitelisting** (Optional)
   - For admin endpoints, consider IP whitelisting
   - Not necessary for general user authentication

5. **2FA** (Future Enhancement)
   - Consider adding two-factor authentication for admin accounts
   - Not required for Steam-based authentication

## Testing Security Features

### Test OpenID Verification

1. Try accessing `/api/auth/verify-openid` with invalid parameters
2. Should return 400 Bad Request

### Test Token Validation

1. Try accessing `/api/auth/me` without a token
2. Should return 401 Unauthorized

3. Try accessing with an expired/invalid token
4. Should return 401 Unauthorized

### Test Cookie Security

1. In browser DevTools, verify cookie has:
   - `HttpOnly` flag set
   - `Secure` flag set (in production)
   - `SameSite=Lax`

2. Try accessing cookie via JavaScript:
   ```javascript
   document.cookie // Should not contain auth_token
   ```

## Migration from localStorage

The old implementation used localStorage to store Steam IDs. The new implementation:

1. ✅ Uses secure HTTP-only cookies
2. ✅ No sensitive data in localStorage
3. ✅ Tokens are server-validated
4. ✅ Automatic expiration

**Breaking Changes**:
- Users will need to log in again after deployment
- Old localStorage Steam IDs will be ignored
- All authentication now goes through secure backend endpoints

## Troubleshooting

### "JWT_SECRET not set" Warning

**Problem**: Backend logs show warning about JWT_SECRET

**Solution**: Set `JWT_SECRET` environment variable in Railway

### "OpenID verification failed"

**Problem**: Steam OpenID signature verification fails

**Possible Causes**:
1. Clock skew between servers
2. Network issues reaching Steam
3. Invalid OpenID parameters

**Solution**: Check backend logs for detailed error messages

### "No authentication token provided"

**Problem**: Frontend cannot get current user

**Possible Causes**:
1. Cookie not being sent (CORS issue)
2. Cookie expired
3. Cookie domain mismatch

**Solution**: 
- Verify CORS settings allow credentials
- Check cookie domain matches frontend domain
- Verify `credentials: 'include'` in fetch requests

## Security Checklist

Before deploying to production:

- [ ] Set `JWT_SECRET` environment variable (64+ characters)
- [ ] Set `STEAM_API_KEY` environment variable
- [ ] Verify HTTPS is enabled (Vercel/Railway)
- [ ] Test OpenID flow in production
- [ ] Verify cookies have `Secure` flag in production
- [ ] Test logout functionality
- [ ] Verify token expiration works (wait 30 days or manually expire)
- [ ] Review CORS settings (only allow your frontend domain)
- [ ] Enable backend logging for security events
- [ ] Set up monitoring/alerts for failed authentication attempts





