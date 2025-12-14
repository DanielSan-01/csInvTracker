/**
 * Utilities to convert between backend DTOs and frontend types
 */

import { InventoryItemDto } from './api';
import { CSItem, Rarity, Exterior, ItemType, shouldShowFloat } from './mockData';

/**
 * Convert backend InventoryItemDto to frontend CSItem format
 */
export function inventoryItemToCSItem(dto: InventoryItemDto): CSItem {
  const marketHashName = dto.marketHashName?.trim() || undefined;
  const exterior = dto.exterior?.trim();

  // Try to build the most accurate Steam Market URL we can.
  // Only append exterior for float-eligible items; non-float items (agents, stickers, cases, etc.)
  // should not have wear suffixes in the URL.
  const exteriorSuffixCandidates = new Set([
    'Factory New',
    'Minimal Wear',
    'Field-Tested',
    'Well-Worn',
    'Battle-Scarred',
  ]);

  let listingName = marketHashName;
  const isFloatEligible = dto.type ? shouldShowFloat(dto.type as ItemType) : true;
  if (isFloatEligible) {
    if (
      listingName &&
      exterior &&
      !listingName.includes('(') &&
      exteriorSuffixCandidates.has(exterior)
    ) {
      listingName = `${listingName} (${exterior})`;
    }
  }

  const converted = {
    id: dto.id.toString(),
    skinId: dto.skinId,
    name: dto.skinName,
    marketHashName,
    rarity: dto.rarity as Rarity,
    float: dto.float,
    exterior: dto.exterior as Exterior,
    paintSeed: dto.paintSeed,
    paintIndex: dto.paintIndex,
    price: dto.price,
    cost: dto.cost,
    imageUrl: dto.imageUrl || '',
    type: dto.type as ItemType,
    collection: dto.collection ?? undefined,
    weapon: dto.weapon ?? undefined,
    tradeProtected: dto.tradeProtected,
    tradableAfter: dto.tradableAfter ? new Date(dto.tradableAfter) : undefined,
    dopplerPhase: dto.dopplerPhase,
    dopplerPhaseImageUrl: dto.dopplerPhaseImageUrl,
    stickers: dto.stickers?.map(s => ({
      id: s.id,
      name: s.name,
      price: s.price,
      slot: s.slot,
      imageUrl: s.imageUrl,
    })),
    priceExceedsSteamLimit: dto.priceExceedsSteamLimit,
    steamListingUrl: listingName
      ? `https://steamcommunity.com/market/listings/730/${encodeURIComponent(listingName)}`
      : undefined,
  };
  
  // Debug logging for stickers
  if (dto.stickers && dto.stickers.length > 0) {
    console.log('[dataConverter] Converting item', dto.id, 'with', dto.stickers.length, 'stickers:', dto.stickers);
    console.log('[dataConverter] Converted stickers:', converted.stickers);
  }
  
  return converted;
}

/**
 * Convert array of backend DTOs to frontend CSItems
 */
export function inventoryItemsToCSItems(dtos: InventoryItemDto[]): CSItem[] {
  return dtos.map(inventoryItemToCSItem);
}

