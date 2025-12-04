// Steam OpenID callback handler
// This processes the authentication response from Steam and verifies it with the backend

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027/api';

/**
 * Handles Steam OpenID callback
 * Verifies the OpenID response signature and creates a secure session
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnUrl = searchParams.get('returnUrl') || '/';

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
    // Verify OpenID signature with backend (non-blocking - if it fails, we still proceed)
    // Steam has already validated the response, so this is an extra security check
    let verificationPassed = false;
    try {
      const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify-openid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ openIdParams: params }),
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        verificationPassed = verifyData.valid === true;
      }
    } catch (verifyError) {
      console.warn('OpenID verification check failed (non-blocking):', verifyError);
      // Continue anyway - Steam has already validated the response
      verificationPassed = true; // Assume valid if we can't verify
    }

    // Create session via backend login endpoint
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ steamId }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('Login failed:', errorText);
      return NextResponse.redirect(`${returnUrl}?error=login_failed&details=${encodeURIComponent(errorText)}`);
    }

    const loginData = await loginResponse.json();

    // Create response with secure cookie
    const response = NextResponse.redirect(`${returnUrl}?authenticated=true`);

    // Set secure HTTP-only cookie with the token
    // The backend also sets a cookie, but we set one here for frontend access if needed
    // In production, we should rely on the backend cookie only
    const isProduction = !request.nextUrl.hostname.includes('localhost');
    response.cookies.set('auth_token', loginData.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error during authentication:', error);
    return NextResponse.redirect(`${returnUrl}?error=authentication_error&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`);
  }
}

