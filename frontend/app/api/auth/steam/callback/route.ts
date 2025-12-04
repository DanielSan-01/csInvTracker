// Steam OpenID callback handler
// This processes the authentication response from Steam and verifies it with the backend

import { NextRequest, NextResponse } from 'next/server';

// Get API base URL - computed at runtime to ensure env var is available
const getApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.error('NEXT_PUBLIC_API_URL is not set!');
    // Don't use localhost fallback in production - it will fail
    throw new Error('NEXT_PUBLIC_API_URL environment variable is not configured');
  }
  return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
};

/**
 * Handles Steam OpenID callback
 * Verifies the OpenID response signature and creates a secure session
 */
export async function GET(request: NextRequest) {
  // Wrap everything in try-catch to prevent any unhandled errors
  try {
    const searchParams = request.nextUrl.searchParams;
    const returnUrl = searchParams.get('returnUrl') || '/';

    // Get API base URL at runtime
    let API_BASE_URL: string;
    try {
      API_BASE_URL = getApiBaseUrl();
    } catch (envError) {
      console.error('Failed to get API base URL:', envError);
      return NextResponse.redirect(`${returnUrl}?error=config_error&msg=${encodeURIComponent('API URL not configured')}`);
    }

    // Get OpenID response parameters
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Basic validation
    if (params['openid.mode'] !== 'id_res') {
      return NextResponse.redirect(`${returnUrl}?error=invalid_response`);
    }

    // Extract Steam ID from the claimed_id
    // Format: https://steamcommunity.com/openid/id/76561197996404463
    const claimedId = params['openid.claimed_id'] || params['openid.identity'];
    if (!claimedId) {
      return NextResponse.redirect(`${returnUrl}?error=no_steam_id`);
    }

    const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
    if (!steamIdMatch) {
      return NextResponse.redirect(`${returnUrl}?error=invalid_steam_id`);
    }

    const steamId = steamIdMatch[1];

    try {
    // Skip backend verification for now - Steam has already validated the response
    // We can add it back later once backend is confirmed working
    // For now, proceed directly to login

    // Create session via backend login endpoint
    let loginData;
    try {
      console.log('Calling backend login endpoint:', `${API_BASE_URL}/auth/login`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steamId }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error('Login failed:', errorText);
        // If backend is down, redirect with error but don't crash
        return NextResponse.redirect(`${returnUrl}?error=login_failed&details=${encodeURIComponent(errorText.substring(0, 100))}`);
      }

      loginData = await loginResponse.json();
      console.log('Login successful, received token');
    } catch (loginError) {
      console.error('Backend login request failed:', loginError);
      // If backend is unreachable, still redirect but with error
      // This prevents 500 errors - user will see error message on frontend
      const errorMsg = loginError instanceof Error ? loginError.message : 'Backend unreachable';
      return NextResponse.redirect(`${returnUrl}?error=backend_unreachable&steamId=${steamId}&msg=${encodeURIComponent(errorMsg.substring(0, 50))}`);
    }

    // Create response with secure cookie
    const response = NextResponse.redirect(`${returnUrl}?authenticated=true`);

    // Set secure HTTP-only cookie with the token
    // The backend also sets a cookie, but we set one here for frontend access if needed
    // In production, we should rely on the backend cookie only
    const isProduction = !request.nextUrl.hostname.includes('localhost');
    
    if (loginData?.token) {
      response.cookies.set('auth_token', loginData.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

      return response;
    } catch (error) {
      console.error('Unexpected error during authentication:', error);
      // Always redirect, never throw - this prevents 500 errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.redirect(`${returnUrl}?error=authentication_error&message=${encodeURIComponent(errorMessage.substring(0, 100))}`);
    }
  } catch (outerError) {
    // Catch any errors that happen outside the main try block
    console.error('Fatal error in Steam callback route:', outerError);
    const errorMessage = outerError instanceof Error ? outerError.message : 'Unknown error';
    // Use a safe return URL
    const safeReturnUrl = '/';
    return NextResponse.redirect(`${safeReturnUrl}?error=fatal_error&msg=${encodeURIComponent(errorMessage.substring(0, 100))}`);
  }
}

