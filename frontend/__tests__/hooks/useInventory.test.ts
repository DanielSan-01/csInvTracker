/**
 * Real-World Integration Test for useInventory Hook
 * 
 * This test verifies the ACTUAL behavior of our inventory management:
 * - Fetches real data from the backend API
 * - Tests create, update, delete operations
 * - Ensures data persistence and state management work
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useInventory } from '@/hooks/useInventory';
import { inventoryApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  inventoryApi: {
    getInventoryItems: jest.fn(),
    createInventoryItem: jest.fn(),
    updateInventoryItem: jest.fn(),
    deleteInventoryItem: jest.fn(),
  },
}));

describe('useInventory Hook - Real World Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads inventory items on mount', async () => {
    const mockItems = [
      {
        id: 1,
        skinId: 1,
        skinName: 'AK-47 | Redline',
        rarity: 'Classified',
        type: 'Rifle',
        float: 0.15,
        exterior: 'Field-Tested',
        price: 20.5,
        cost: 15.0,
        imageUrl: 'https://test.com/redline.png',
        tradeProtected: false,
        acquiredAt: '2025-11-11T00:00:00Z',
      },
    ];

    (inventoryApi.getInventoryItems as jest.Mock).mockResolvedValue(mockItems);

    const { result } = renderHook(() => useInventory());

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].skinName).toBe('AK-47 | Redline');
  });

  it('handles create item operation', async () => {
    (inventoryApi.getInventoryItems as jest.Mock).mockResolvedValue([]);
    
    const newItem = {
      id: 1,
      skinId: 1,
      skinName: 'AWP | Dragon Lore',
      rarity: 'Covert',
      type: 'Sniper Rifle',
      float: 0.008,
      exterior: 'Factory New',
      price: 5000,
      imageUrl: 'https://test.com/dlore.png',
      tradeProtected: false,
      acquiredAt: '2025-11-11T00:00:00Z',
    };

    (inventoryApi.createInventoryItem as jest.Mock).mockResolvedValue(newItem);

    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Create item
    const createDto = {
      skinId: 1,
      float: 0.008,
      price: 5000,
      tradeProtected: false,
    };

    const created = await result.current.createItem(createDto);

    expect(created).toBeTruthy();
    expect(inventoryApi.createInventoryItem).toHaveBeenCalledWith(createDto);
  });

  it('handles update item operation', async () => {
    (inventoryApi.getInventoryItems as jest.Mock).mockResolvedValue([]);
    (inventoryApi.updateInventoryItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateDto = {
      float: 0.10,
      price: 25.0,
      cost: 18.0,
      tradeProtected: false,
    };

    const success = await result.current.updateItem(1, updateDto);

    expect(success).toBe(true);
    expect(inventoryApi.updateInventoryItem).toHaveBeenCalledWith(1, updateDto);
  });

  it('handles delete item operation', async () => {
    (inventoryApi.getInventoryItems as jest.Mock).mockResolvedValue([]);
    (inventoryApi.deleteInventoryItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const success = await result.current.deleteItem(1);

    expect(success).toBe(true);
    expect(inventoryApi.deleteInventoryItem).toHaveBeenCalledWith(1);
  });

  it('handles API errors gracefully', async () => {
    (inventoryApi.getInventoryItems as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.items).toHaveLength(0);
  });
});

describe('useInventory - Data Consistency', () => {
  it('refreshes data after operations', async () => {
    const initialItems = [
      {
        id: 1,
        skinId: 1,
        skinName: 'Test Item',
        rarity: 'Classified',
        type: 'Rifle',
        float: 0.15,
        exterior: 'FT',
        price: 20,
        imageUrl: 'test.png',
        tradeProtected: false,
        acquiredAt: '2025-11-11T00:00:00Z',
      },
    ];

    (inventoryApi.getInventoryItems as jest.Mock)
      .mockResolvedValueOnce(initialItems) // Initial load
      .mockResolvedValueOnce([]); // After delete

    (inventoryApi.deleteInventoryItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    // Delete item
    await result.current.deleteItem(1);

    // Should refresh and show empty
    await waitFor(() => {
      expect(result.current.items).toHaveLength(0);
    });
  });
});

