// Next.js API route to proxy Steam inventory requests
// This avoids CORS issues when fetching from Steam's API

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const steamId = searchParams.get('steamId');
  const appId = searchParams.get('appId') || '730';
  const contextId = searchParams.get('contextId') || '2';

  if (!steamId) {
    return NextResponse.json(
      { error: 'steamId parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch from Steam inventory API
    // Format: https://steamcommunity.com/inventory/{steamid}/{appid}/{contextid}?l=english&count=5000
    const steamUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}?l=english&count=5000`;
    
    console.log('Fetching Steam inventory from:', steamUrl);
    
    const response = await fetch(steamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    console.log('Steam API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Steam API error response:', errorText);
      return NextResponse.json(
        { 
          error: `Steam API error: ${response.status} ${response.statusText}`,
          details: errorText.substring(0, 500) // First 500 chars
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Steam API response data:', {
      success: data.success,
      total_inventory_count: data.total_inventory_count,
      assets_count: data.assets?.length || 0,
      descriptions_count: data.descriptions?.length || 0,
    });
    
    // Return the data as-is (Steam's format)
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Steam inventory:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch Steam inventory',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

