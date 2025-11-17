'use client';

import { useState, useEffect } from 'react';
import { inventoryApi, InventoryItemDto, CreateInventoryItemDto, UpdateInventoryItemDto, InventoryStatsDto } from '@/lib/api';

export function useInventory(userId?: number) {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InventoryStatsDto | null>(null);

  // Fetch inventory on mount or when userId changes
  const fetchInventory = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchInventory();
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
      await inventoryApi.updateInventoryItem(id, data);
      // Refetch to get updated data with calculated fields
      await fetchInventory();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      console.error('Error updating item:', err);
      return false;
    }
  };

  // Delete inventory item
  const deleteItem = async (id: number): Promise<boolean> => {
    try {
      await inventoryApi.deleteInventoryItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      console.error('Error deleting item:', err);
      return false;
    }
  };

  return {
    items,
    stats,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    refresh: fetchInventory,
  };
}

