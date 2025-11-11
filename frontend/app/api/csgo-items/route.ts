import { NextResponse } from 'next/server';

// Using the public ByMykel CS:GO API
// https://github.com/ByMykel/CSGO-API
const CSGO_API_BASE = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'skins'; // skins, knives, gloves, stickers, cases, etc.

  try {
    console.log(`🔍 Fetching CS:GO ${type} from ByMykel API...`);
    console.log(`📍 URL: ${CSGO_API_BASE}/${type}.json`);
    
    const response = await fetch(`${CSGO_API_BASE}/${type}.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CSInvTracker/1.0',
      },
      // Cache for 1 hour
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      console.error(`❌ API returned ${response.status} ${response.statusText}`);
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched ${Array.isArray(data) ? data.length : 'unknown'} ${type}`);
    
    // Log a sample item to see the structure
    if (Array.isArray(data) && data.length > 0) {
      console.log('📦 Sample item:', JSON.stringify(data[0], null, 2));
    }

    return NextResponse.json({
      success: true,
      type,
      count: Array.isArray(data) ? data.length : 0,
      data
    });
  } catch (error) {
    console.error(`❌ Error fetching CS:GO ${type}:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

