// Steam OpenID authentication utilities
// Reference: https://steamcommunity.com/dev

/**
 * Initiates Steam login
 * Redirects user to Steam's OpenID login page
 */
export function initiateSteamLogin(returnUrl: string = '/') {
  const callbackUrl = encodeURIComponent(
    `${window.location.origin}/api/auth/steam/callback?returnUrl=${encodeURIComponent(returnUrl)}`
  );
  
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': callbackUrl,
    'openid.realm': window.location.origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  window.location.href = `https://steamcommunity.com/openid/login?${params.toString()}`;
}

/**
 * Gets Steam ID from URL (after authentication callback)
 */
export function getSteamIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('steamId');
}

/**
 * Checks if user is authenticated (has Steam ID in URL or session)
 * In production, check session/cookies instead
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('authenticated') === 'true' || !!getSteamIdFromUrl();
}

/**
 * Stores Steam ID in localStorage (temporary solution)
 * In production, use secure HTTP-only cookies or sessions
 */
export function storeSteamId(steamId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('steamId', steamId);
}

/**
 * Retrieves stored Steam ID
 */
export function getStoredSteamId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('steamId');
}

/**
 * Clears stored Steam ID
 */
export function clearSteamId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('steamId');
}

