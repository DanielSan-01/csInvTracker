/**
 * Utilities to convert between backend DTOs and frontend types
 */

import { InventoryItemDto } from './api';
import { CSItem, Rarity, Exterior, ItemType } from './mockData';

/**
 * Convert backend InventoryItemDto to frontend CSItem format
 */
export function inventoryItemToCSItem(dto: InventoryItemDto): CSItem {
  const marketHashName = dto.marketHashName ?? undefined;
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
    steamListingUrl: marketHashName
      ? `https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketHashName)}`
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

