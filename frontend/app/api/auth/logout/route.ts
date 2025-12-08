import { NextRequest, NextResponse } from 'next/server';

const getApiBaseUrl = (): string | null => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return null;
  }
  return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
};

export async function POST(request: NextRequest) {
  const isProduction = !request.nextUrl.hostname.includes('localhost');
  const response = NextResponse.json({ message: 'Logged out successfully' });

  // Always clear cookies on the current domain
  response.cookies.delete('auth_token');
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.delete('auth_token_client');
  response.cookies.set('auth_token_client', '', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  // For production, explicitly clear cookies on the main site domain
  if (isProduction) {
    const sharedDomain = '.csinvtracker.com';

    response.cookies.delete({
      name: 'auth_token',
      domain: sharedDomain,
      path: '/',
    });
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      domain: sharedDomain,
    });

    response.cookies.delete({
      name: 'auth_token_client',
      domain: sharedDomain,
      path: '/',
    });
    response.cookies.set('auth_token_client', '', {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      domain: sharedDomain,
    });
  }

  // Best-effort call to backend so it can perform any server-side cleanup
  const API_BASE_URL = getApiBaseUrl();
  if (API_BASE_URL) {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers,
      });
    } catch (error) {
      console.warn('Backend logout request failed, continuing anyway:', error);
    }
  }

  return response;
}

