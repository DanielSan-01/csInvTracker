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

  // Validate SteamID64 format: Must be a 17-digit number starting with 7656119...
  if (!/^\d{17}$/.test(steamId)) {
    console.error('Invalid steamId format:', steamId);
    return NextResponse.json(
      { error: 'Invalid steamId format. Steam IDs must be 17 digits.' },
      { status: 400 }
    );
  }
  
  if (!steamId.startsWith('7656119')) {
    console.error('Invalid SteamID64 format (must start with 7656119):', steamId);
    return NextResponse.json(
      { error: 'Invalid SteamID64 format. Steam IDs must start with 7656119...' },
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
      
      // Build URL - start with base URL without query parameters (works better)
      // Only add start_assetid for pagination if we have one
      let steamUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/${contextId}`;
      if (startAssetId) {
        steamUrl += `?start_assetid=${startAssetId}`;
      }
      
      console.log(`Fetching Steam inventory page ${pageCount} from:`, steamUrl);
      
      // Add browser-like headers to avoid being blocked
      const response = await fetch(steamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': `https://steamcommunity.com/profiles/${steamId}/inventory/`,
          'Origin': 'https://steamcommunity.com',
        },
      });

      console.log(`Steam API response status (page ${pageCount}):`, response.status);

      if (!response.ok) {
        // Try to read error response
        let errorText = '';
        try {
          const contentType = response.headers.get('content-type') || 'unknown';
          const contentLength = response.headers.get('content-length');
          
          // Try to read as text first
          try {
            errorText = await response.text();
          } catch (e) {
            // If text fails, try as array buffer (might be compressed)
            const buffer = await response.arrayBuffer();
            errorText = new TextDecoder().decode(buffer);
          }
          
          console.error(`Steam API error (page ${pageCount}): Status=${response.status}, ContentType=${contentType}, ContentLength=${contentLength}, Error=${errorText.substring(0, 200)}`);
          
          // If empty response with 400, it's likely IP blocking
          if (response.status === 400 && (!errorText || errorText.trim() === '')) {
            return NextResponse.json(
              { 
                error: 'Steam API returned empty 400 response',
                details: 'Steam may be blocking requests from this IP address. This could indicate rate limiting or IP blocking.',
                statusCode: response.status
              },
              { status: 400 }
            );
          }
        } catch (e) {
          console.error('Failed to read error response:', e);
          errorText = 'Failed to read error response';
        }
        
        return NextResponse.json(
          { 
            error: `Steam API error: ${response.status} ${response.statusText}`,
            details: errorText ? errorText.substring(0, 500) : 'No error details available'
          },
          { status: response.status }
        );
      }

      // Handle null response from Steam (can happen with certain query parameters)
      const responseText = await response.text();
      if (!responseText || responseText.trim() === 'null' || responseText.trim() === '') {
        console.warn(`Steam API returned null response (page ${pageCount}). This may indicate the inventory is empty or private.`);
        
        // If this is the first page and we got null, it might mean private inventory
        if (pageCount === 1) {
          return NextResponse.json(
            { 
              error: 'Steam inventory is not accessible',
              details: 'Steam returned null response. This usually means your inventory privacy is set to private. Please make your inventory public in Steam privacy settings.',
              suggestion: 'Go to Steam > Settings > Privacy > Inventory Privacy and set it to Public'
            },
            { status: 400 }
          );
        }
        
        // Otherwise, break and return what we have
        break;
      }
      
      const data = JSON.parse(responseText);
      
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

