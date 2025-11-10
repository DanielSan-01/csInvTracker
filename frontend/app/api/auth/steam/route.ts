// Steam OpenID authentication endpoint
// Reference: https://steamcommunity.com/dev
// Steam OpenID Provider: https://steamcommunity.com/openid

import { NextRequest, NextResponse } from 'next/server';

/**
 * Initiates Steam OpenID authentication
 * This redirects the user to Steam's login page
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const returnUrl = searchParams.get('returnUrl') || '/';

  // Steam OpenID parameters
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/steam/callback?returnUrl=${encodeURIComponent(returnUrl)}`,
    'openid.realm': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  // Redirect to Steam login
  const steamLoginUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
  
  return NextResponse.redirect(steamLoginUrl);
}

