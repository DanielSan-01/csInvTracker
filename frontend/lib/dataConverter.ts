/**
 * Utilities to convert between backend DTOs and frontend types
 */

import { InventoryItemDto } from './api';
import { CSItem, Rarity, Exterior, ItemType } from './mockData';

/**
 * Convert backend InventoryItemDto to frontend CSItem format
 */
export function inventoryItemToCSItem(dto: InventoryItemDto): CSItem {
  return {
    id: dto.id.toString(),
    name: dto.skinName,
    rarity: dto.rarity as Rarity,
    float: dto.float,
    exterior: dto.exterior as Exterior,
    paintSeed: dto.paintSeed,
    price: dto.price,
    cost: dto.cost,
    imageUrl: dto.imageUrl || '',
    type: dto.type as ItemType,
    tradeProtected: dto.tradeProtected,
    tradableAfter: dto.tradableAfter ? new Date(dto.tradableAfter) : undefined,
  };
}

/**
 * Convert array of backend DTOs to frontend CSItems
 */
export function inventoryItemsToCSItems(dtos: InventoryItemDto[]): CSItem[] {
  return dtos.map(inventoryItemToCSItem);
}

