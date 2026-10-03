// Steam OpenID authentication utilities
// Reference: https://steamcommunity.com/dev

/**
 * Initiates Steam login
 * Redirects user to Steam's OpenID login page
 */
export function initiateSteamLogin(returnUrl: string = '/') {
  // Use the full URL including protocol for the callback
  const baseUrl = window.location.origin;
  const callbackUrl = `${baseUrl}/api/auth/steam/callback?returnUrl=${encodeURIComponent(returnUrl)}`;
  
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': callbackUrl, // Don't double-encode - URLSearchParams handles it
    'openid.realm': baseUrl, // Must match the domain of return_to
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  window.location.href = `https://steamcommunity.com/openid/login?${params.toString()}`;
}


