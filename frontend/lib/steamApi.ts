// Steam API integration for fetching inventory data
// Reference: https://steamcommunity.com/dev

export interface SteamInventoryItem {
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
}

export interface SteamItemDescription {
  appid: string;
  classid: string;
  instanceid: string;
  currency: number;
  background_color: string;
  icon_url: string;
  icon_url_large?: string;
  descriptions?: Array<{
    type: string;
    value: string;
    color?: string;
  }>;
  tradable: number;
  name: string;
  name_color: string;
  type: string;
  market_name: string;
  market_hash_name: string;
  commodity: number;
  market_tradable_restriction?: number;
  market_marketable_restriction?: number;
  marketable: number;
  tags?: Array<{
    category: string;
    internal_name: string;
    localized_category_name: string;
    localized_tag_name: string;
    color?: string;
  }>;
}

export interface SteamInventoryResponse {
  assets: SteamInventoryItem[];
  descriptions: SteamItemDescription[];
  more_items: number;
  last_assetid?: string;
  total_inventory_count: number;
  success: number;
  rwgrsn: number;
}

export interface ParsedSteamItem {
  assetid: string;
  name: string;
  marketName: string;
  imageUrl: string;
  type: string;
  tradable: boolean;
  marketable: boolean;
  descriptions?: Array<{ type: string; value: string; color?: string }>;
  tags?: Array<{
    category: string;
    internal_name: string;
    localized_category_name: string;
    localized_tag_name: string;
    color?: string;
  }>;
}

/**
 * Fetches Steam inventory for a user
 * @param steamId - 64-bit Steam ID
 * @param appId - App ID (730 for CS:GO/CS2)
 * @param contextId - Context ID (2 for CS:GO/CS2)
 * @returns Parsed inventory items
 */
export async function fetchSteamInventory(
  steamId: string,
  appId: number = 730,
  contextId: number = 2
): Promise<ParsedSteamItem[]> {
  try {
    // Use our API route to avoid CORS issues
    const response = await fetch(`/api/steam/inventory?steamId=${steamId}&appId=${appId}&contextId=${contextId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Steam API error response:', errorText);
      throw new Error(`Failed to fetch inventory: ${response.status} ${response.statusText}`);
    }

    const data: SteamInventoryResponse = await response.json();
    
    console.log('Steam API response:', data);
    
    if (data.success !== 1) {
      console.error('Steam API unsuccessful:', data);
      throw new Error(`Steam API returned unsuccessful response. Success: ${data.success}`);
    }
    
    if (!data.assets || data.assets.length === 0) {
      console.warn('No assets found in inventory');
      return [];
    }
    
    if (!data.descriptions || data.descriptions.length === 0) {
      console.warn('No descriptions found in inventory');
      return [];
    }

    // Map assets to descriptions
    const itemMap = new Map<string, SteamItemDescription>();
    data.descriptions.forEach(desc => {
      const key = `${desc.classid}_${desc.instanceid}`;
      itemMap.set(key, desc);
    });

    // Parse items
    const parsedItems: ParsedSteamItem[] = data.assets.map(asset => {
      const key = `${asset.classid}_${asset.instanceid}`;
      const description = itemMap.get(key);

      if (!description) {
        // Skip items without descriptions
        return null;
      }

      // Convert relative icon URL to full Steam economy image URL
      const imageUrl = description.icon_url
        ? `https://community.fastly.steamstatic.com/economy/image/${description.icon_url}/330x192?allow_animated=1`
        : '';

      return {
        assetid: asset.assetid,
        name: description.name,
        marketName: description.market_name || description.name,
        imageUrl,
        type: description.type,
        tradable: description.tradable === 1,
        marketable: description.marketable === 1,
        descriptions: description.descriptions,
        tags: description.tags,
      };
    }).filter((item): item is ParsedSteamItem => item !== null);

    return parsedItems;
  } catch (error) {
    console.error('Error fetching Steam inventory:', error);
    throw error;
  }
}

/**
 * Converts Steam inventory items to CSItem format
 * Note: This is a basic conversion - you may need to enhance this
 * to extract float values, exterior, etc. from item descriptions
 */
export function convertSteamItemToCSItem(
  steamItem: ParsedSteamItem,
  index: number
): Partial<import('./mockData').CSItem> {
  // Extract float value from descriptions if available
  let float: number | undefined;
  let exterior: import('./mockData').Exterior | undefined;
  let paintSeed: number | undefined;

  if (steamItem.descriptions) {
    steamItem.descriptions.forEach(desc => {
      if (desc.type === 'float' || desc.value?.includes('Float:')) {
        const floatMatch = desc.value.match(/[\d.]+/);
        if (floatMatch) {
          float = parseFloat(floatMatch[0]);
        }
      }
      // You can add more parsing logic here for exterior, paint seed, etc.
    });
  }

  // Determine rarity from tags
  let rarity: import('./mockData').Rarity = 'Consumer Grade';
  if (steamItem.tags) {
    const rarityTag = steamItem.tags.find(tag => tag.category === 'Rarity');
    if (rarityTag) {
      const rarityMap: Record<string, import('./mockData').Rarity> = {
        'Consumer Grade': 'Consumer Grade',
        'Industrial Grade': 'Industrial Grade',
        'Mil-Spec Grade': 'Mil-Spec',
        'Restricted': 'Restricted',
        'Classified': 'Classified',
        'Covert': 'Covert',
        'Extraordinary': 'Extraordinary',
        'Contraband': 'Contraband',
      };
      rarity = rarityMap[rarityTag.localized_tag_name] || 'Consumer Grade';
    }
  }

  return {
    id: steamItem.assetid,
    name: steamItem.marketName,
    rarity,
    float: float ?? 0.5,
    exterior: exterior || 'Field-Tested',
    price: 0, // Would need to fetch from market API
    imageUrl: steamItem.imageUrl,
    game: 'Counter-Strike 2',
  };
}

