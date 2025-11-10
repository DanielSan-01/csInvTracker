// Steam OpenID callback handler
// This processes the authentication response from Steam

import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles Steam OpenID callback
 * Extracts Steam ID from the response and creates a session
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Get OpenID response parameters
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Verify the OpenID response (simplified - in production, verify the signature)
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

  // TODO: In production, you should:
  // 1. Verify the OpenID response signature
  // 2. Create a session/token for the user
  // 3. Store the Steam ID in the session
  // 4. Redirect to the return URL with success

  // For now, we'll redirect with the Steam ID as a query parameter
  // In production, use secure sessions/cookies instead
  return NextResponse.redirect(`${returnUrl}?steamId=${steamId}&authenticated=true`);
}

