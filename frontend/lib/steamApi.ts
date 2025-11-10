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

  // Determine item type from tags or name
  let type: import('./mockData').ItemType = 'Rifle';
  if (steamItem.tags) {
    const typeTag = steamItem.tags.find(tag => tag.category === 'Type' || tag.category === 'Weapon');
    if (typeTag) {
      const typeName = typeTag.localized_tag_name.toLowerCase();
      if (typeName.includes('glove')) type = 'Gloves';
      else if (typeName.includes('knife')) type = 'Knife';
      else if (typeName.includes('rifle')) type = 'Rifle';
      else if (typeName.includes('pistol')) type = 'Pistol';
      else if (typeName.includes('smg') || typeName.includes('submachine')) type = 'SMG';
      else if (typeName.includes('sniper')) type = 'Sniper Rifle';
      else if (typeName.includes('shotgun')) type = 'Shotgun';
      else if (typeName.includes('machine gun') || typeName.includes('machinegun')) type = 'Machine Gun';
      else if (typeName.includes('agent') || typeName.includes('character')) type = 'Agent';
      else if (typeName.includes('equipment') || typeName.includes('gear')) type = 'Equipment';
    }
  }
  // Fallback: check item name
  if (!type || type === 'Rifle') {
    const name = steamItem.marketName.toLowerCase();
    if (name.includes('glove')) type = 'Gloves';
    else if (name.includes('knife') || name.includes('karambit') || name.includes('bayonet') || name.includes('butterfly')) type = 'Knife';
    else if (name.includes('ak-47') || name.includes('m4a4') || name.includes('m4a1-s') || name.includes('aug') || name.includes('sg 553') || name.includes('famas') || name.includes('galil')) type = 'Rifle';
    else if (name.includes('glock') || name.includes('usp-s') || name.includes('p2000') || name.includes('p250') || name.includes('five-seven') || name.includes('tec-9') || name.includes('cz75') || name.includes('desert eagle') || name.includes('dual berettas') || name.includes('r8 revolver')) type = 'Pistol';
    else if (name.includes('mac-10') || name.includes('mp9') || name.includes('mp7') || name.includes('mp5-sd') || name.includes('ump-45') || name.includes('p90') || name.includes('pp-bizon')) type = 'SMG';
    else if (name.includes('awp') || name.includes('ssg 08') || name.includes('g3sg1') || name.includes('scar-20')) type = 'Sniper Rifle';
    else if (name.includes('nova') || name.includes('xm1014') || name.includes('sawedoff') || name.includes('mag-7')) type = 'Shotgun';
    else if (name.includes('m249') || name.includes('negev')) type = 'Machine Gun';
    else if (name.includes('agent') || name.includes('operator') || name.includes('lieutenant') || name.includes('officer') || name.includes('soldier')) type = 'Agent';
    else if (name.includes('zeus') || name.includes('sticker') || name.includes('patch') || name.includes('pin')) type = 'Equipment';
  }

  return {
    id: steamItem.assetid,
    name: steamItem.marketName,
    rarity,
    type,
    float: float ?? 0.5,
    exterior: exterior || 'Field-Tested',
    price: 0, // Would need to fetch from market API
    imageUrl: steamItem.imageUrl,
  };
}

