'use client';

import { useState, useEffect } from 'react';
import { inventoryApi, InventoryItemDto, CreateInventoryItemDto, UpdateInventoryItemDto, InventoryStatsDto } from '@/lib/api';

export function useInventory(userId?: number) {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InventoryStatsDto | null>(null);

  // Fetch inventory on mount or when userId changes
  const fetchInventory = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      const [itemsData, statsData] = await Promise.all([
        inventoryApi.getInventoryItems(userId),
        inventoryApi.getStats(userId),
      ]);
      setItems(itemsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
      console.error('Error fetching inventory:', err);
      setStats(null);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (userId) {
      fetchInventory(true);
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [userId]);

  // Create new inventory item
  const createItem = async (data: CreateInventoryItemDto): Promise<InventoryItemDto | null> => {
    try {
      const newItem = await inventoryApi.createInventoryItem(data);
      setItems(prev => [newItem, ...prev]); // Add to beginning
      // Refresh stats to reflect new item
      const statsData = await inventoryApi.getStats(userId);
      setStats(statsData);
      return newItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
      console.error('Error creating item:', err);
      return null;
    }
  };

  // Update existing inventory item
  const updateItem = async (id: number, data: UpdateInventoryItemDto): Promise<boolean> => {
    try {
      setRefreshing(true);
      console.log('[useInventory] Updating item:', id, 'with data:', JSON.stringify(data, null, 2));
      const updatedItem = await inventoryApi.updateInventoryItem(id, data);
      console.log('[useInventory] Updated item response:', JSON.stringify(updatedItem, null, 2));
      console.log('[useInventory] Stickers in response:', updatedItem.stickers);
      
      // Refetch to get updated data with calculated fields and stats
      const [itemsData, statsData] = await Promise.all([
        inventoryApi.getInventoryItems(userId),
        inventoryApi.getStats(userId),
      ]);
      console.log('[useInventory] Refetched items, checking for stickers...');
      const updatedItemFromFetch = itemsData.find(item => item.id === id);
      if (updatedItemFromFetch) {
        console.log('[useInventory] Found updated item in fetch:', updatedItemFromFetch.id, 'stickers:', updatedItemFromFetch.stickers);
      }
      setItems(itemsData);
      setStats(statsData);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      console.error('Error updating item:', err);
      return false;
    } finally {
      setRefreshing(false);
    }
  };

  // Delete inventory item
  const deleteItem = async (id: number): Promise<boolean> => {
    try {
      setRefreshing(true);
      await inventoryApi.deleteInventoryItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      // Refresh stats to reflect deleted item
      const statsData = await inventoryApi.getStats(userId);
      setStats(statsData);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      console.error('Error deleting item:', err);
      return false;
    } finally {
      setRefreshing(false);
    }
  };

  return {
    items,
    stats,
    loading,
    refreshing,
    error,
    createItem,
    updateItem,
    deleteItem,
    refresh: () => fetchInventory(false),
  };
}

