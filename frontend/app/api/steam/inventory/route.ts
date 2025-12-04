// Next.js API route to proxy Steam inventory requests
// This avoids CORS issues when fetching from Steam's API

import { NextRequest, NextResponse } from 'next/server';

// Configure route for longer execution time (Vercel allows up to 60s on Hobby plan)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const steamId = searchParams.get('steamId');
  const appId = searchParams.get('appId') || '730';
  const contextId = searchParams.get('contextId') || '2';

  console.log('Steam inventory API route called with params:', { steamId, appId, contextId });

  if (!steamId) {
    console.error('Missing steamId parameter');
    return NextResponse.json(
      { error: 'steamId parameter is required' },
      { status: 400 }
    );
  }

  // Validate steamId format (should be 17 digits)
  if (!/^\d{17}$/.test(steamId)) {
    console.error('Invalid steamId format:', steamId);
    return NextResponse.json(
      { error: 'Invalid steamId format. Steam IDs must be 17 digits.' },
      { status: 400 }
    );
  }

  try {
    // Fetch from Steam inventory API with pagination support
    // Steam's inventory API is paginated - we need to fetch all pages
    const allAssets: any[] = [];
    const allDescriptions: any[] = [];
    const descriptionMap = new Map<string, any>(); // Track unique descriptions by classid_instanceid
    
    let startAssetId: string | null = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 50; // Safety limit to prevent infinite loops
    
    while (hasMore && pageCount < maxPages) {
      pageCount++;
      
      // Build URL with pagination
      let steamUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}?l=english&count=5000`;
      if (startAssetId) {
        steamUrl += `&start_assetid=${startAssetId}`;
      }
      
      console.log(`Fetching Steam inventory page ${pageCount} from:`, steamUrl);
      
      const response = await fetch(steamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      console.log(`Steam API response status (page ${pageCount}):`, response.status);

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
      
      // Check if request was successful
      if (data.success !== 1) {
        console.error('Steam API returned unsuccessful response:', data);
        // If this is the first page and it failed, return error
        if (pageCount === 1) {
          return NextResponse.json(
            { 
              error: 'Steam API returned unsuccessful response',
              details: `Success: ${data.success}`
            },
            { status: 500 }
          );
        }
        // Otherwise, break and return what we have
        break;
      }
      
      // Collect assets
      if (data.assets && Array.isArray(data.assets)) {
        allAssets.push(...data.assets);
      }
      
      // Collect unique descriptions (Steam may return duplicates across pages)
      if (data.descriptions && Array.isArray(data.descriptions)) {
        for (const desc of data.descriptions) {
          const key = `${desc.classid}_${desc.instanceid}`;
          if (!descriptionMap.has(key)) {
            descriptionMap.set(key, desc);
            allDescriptions.push(desc);
          }
        }
      }
      
      console.log(`Page ${pageCount} - Assets: ${data.assets?.length || 0}, Descriptions: ${data.descriptions?.length || 0}, Total so far: ${allAssets.length} assets, ${allDescriptions.length} descriptions`);
      
      // Check if there are more items to fetch
      // Steam uses 'more_items' or 'last_assetid' to indicate pagination
      hasMore = data.more_items === 1 || (data.last_assetid && data.last_assetid !== startAssetId);
      if (hasMore && data.last_assetid) {
        startAssetId = data.last_assetid;
      } else {
        hasMore = false;
      }
      
      // Small delay to avoid rate limiting (only if we have more pages)
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`Finished fetching Steam inventory: ${pageCount} pages, ${allAssets.length} total assets, ${allDescriptions.length} unique descriptions`);
    
    // Return combined data in Steam's format
    const combinedData = {
      success: 1,
      total_inventory_count: allAssets.length,
      assets: allAssets,
      descriptions: allDescriptions,
      more_items: 0, // We've fetched everything
    };
    
    return NextResponse.json(combinedData);
  } catch (error) {
    console.error('Error fetching Steam inventory:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Check if it's a timeout or network error
    if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      return NextResponse.json(
        { 
          error: 'Request timeout - Steam inventory may be too large. Please try again.',
          details: errorMessage
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Steam inventory',
        details: errorMessage,
        ...(errorStack && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

