'use client';

import { useEffect, useState } from 'react';
import {
  inventoryApi,
  skinsApi,
  InventoryItemDto,
  InventoryStatsDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from '@/lib/api';
import { getExteriorFromFloat } from '@/lib/mockData';

function computeStats(items: InventoryItemDto[]): InventoryStatsDto {
  const marketValue = items.reduce((sum, item) => sum + item.price, 0);
  const acquisitionCost = items.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const netProfit = marketValue - acquisitionCost;
  return {
    totalItems: items.length,
    marketValue,
    acquisitionCost,
    netProfit,
    averageProfitPercent: acquisitionCost > 0 ? (netProfit / acquisitionCost) * 100 : null,
  };
}

let localIdCounter = -1;

/**
 * Same shape as useInventory, but after the one-time seed read every
 * create/update/delete only mutates local state - nothing is ever written
 * back to the backend. Used by the demo page so it can render the real
 * ItemGrid without risking writes to the seeded account.
 */
export function useDemoInventory(userId: number, enabled: boolean) {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    inventoryApi
      .getInventoryItems(userId)
      .then((data) => {
        if (mounted) setItems(data);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load demo inventory');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [enabled, userId]);

  const createItem = async (data: CreateInventoryItemDto): Promise<InventoryItemDto | null> => {
    try {
      const skin = await skinsApi.getSkinById(data.skinId);
      const float = data.float ?? 0.5;
      const newItem: InventoryItemDto = {
        id: localIdCounter--,
        skinId: data.skinId,
        skinName: skin.name,
        marketHashName: skin.marketHashName,
        rarity: skin.rarity,
        type: skin.type,
        collection: skin.collection,
        weapon: skin.weapon,
        float,
        exterior: getExteriorFromFloat(float),
        paintSeed: data.paintSeed,
        price: data.price,
        cost: data.cost,
        imageUrl: data.imageUrl ?? skin.imageUrl,
        tradeProtected: data.tradeProtected ?? false,
        tradableAfter: data.tradableAfter,
        acquiredAt: new Date().toISOString(),
        paintIndex: skin.paintIndex,
        dopplerPhase: skin.dopplerPhase,
        dopplerPhaseImageUrl: skin.dopplerPhaseImageUrl,
        stickers: data.stickers?.map((sticker, idx) => ({ id: -(idx + 1), ...sticker })),
        priceExceedsSteamLimit: skin.priceExceedsSteamLimit ?? false,
      };
      setItems((prev) => [newItem, ...prev]);
      return newItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      return null;
    }
  };

  const updateItem = async (id: number, data: UpdateInventoryItemDto): Promise<boolean> => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              float: data.float,
              exterior: getExteriorFromFloat(data.float),
              paintSeed: data.paintSeed,
              price: data.price,
              cost: data.cost,
              imageUrl: data.imageUrl ?? item.imageUrl,
              tradeProtected: data.tradeProtected,
              tradableAfter: data.tradableAfter,
              stickers: data.stickers
                ? data.stickers.map((sticker, idx) => ({ id: -(idx + 1), ...sticker }))
                : item.stickers,
            }
          : item
      )
    );
    return true;
  };

  const deleteItem = async (id: number): Promise<boolean> => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    return true;
  };

  return {
    items,
    stats: computeStats(items),
    loading,
    refreshing: false,
    error,
    createItem,
    updateItem,
    deleteItem,
    refresh: async () => {},
  };
}
