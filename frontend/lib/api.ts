// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027/api';

// Types matching backend DTOs
export interface SkinDto {
  id: number;
  name: string;
  rarity: string;
  type: string;
  collection?: string;
  weapon?: string;
  imageUrl?: string;
  defaultPrice?: number;
  paintIndex?: number;
  dopplerPhase?: string;
  dopplerPhaseImageUrl?: string;
}

export interface InventoryItemDto {
  id: number;
  skinId: number;
  skinName: string;
  rarity: string;
  type: string;
  float: number;
  exterior: string;
  paintSeed?: number;
  price: number;
  cost?: number;
  imageUrl?: string;
  tradeProtected: boolean;
  tradableAfter?: string;
  acquiredAt: string;
  paintIndex?: number;
  dopplerPhase?: string;
  dopplerPhaseImageUrl?: string;
}

export interface CreateInventoryItemDto {
  userId: number;
  skinId: number;
  float: number;
  paintSeed?: number;
  price: number;
  cost?: number;
  imageUrl?: string;
  tradeProtected: boolean;
}

export interface UpdateInventoryItemDto {
  float: number;
  paintSeed?: number;
  price: number;
  cost?: number;
  imageUrl?: string;
  tradeProtected: boolean;
}

// Skins API
export const skinsApi = {
  getSkins: async (search?: string): Promise<SkinDto[]> => {
    const url = new URL(`${API_BASE_URL}/skins`);
    if (search) {
      url.searchParams.append('search', search);
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch skins');
    }
    return response.json();
  },

  getSkinById: async (id: number): Promise<SkinDto> => {
    const response = await fetch(`${API_BASE_URL}/skins/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch skin');
    }
    return response.json();
  },
};

// User API
export interface User {
  id: number;
  steamId: string;
  username?: string;
  createdAt: string;
  lastLoginAt: string;
}

export const usersApi = {
  getOrCreateUserBySteamId: async (steamId: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/by-steam/${steamId}`);
    if (!response.ok) {
      throw new Error('Failed to get/create user');
    }
    return response.json();
  },

  getUserById: async (id: number): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  },
};

export interface BulkImportInventoryResult {
  userId: number;
  totalRequested: number;
  successCount: number;
  failedCount: number;
  errors: string[];
}

export const adminApi = {
  importInventoryFromCsv: async (userId: number, file: File): Promise<BulkImportInventoryResult> => {
    const formData = new FormData();
    formData.append('userId', userId.toString());
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/admin/import-inventory-csv`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to import CSV' }));
      throw new Error(error.error || 'Failed to import CSV');
    }

    return response.json();
  },
};

// Inventory API
export const inventoryApi = {
  getInventoryItems: async (userId?: number): Promise<InventoryItemDto[]> => {
    const url = new URL(`${API_BASE_URL}/inventory`);
    if (userId) {
      url.searchParams.append('userId', userId.toString());
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }
    return response.json();
  },

  createInventoryItem: async (item: CreateInventoryItemDto): Promise<InventoryItemDto> => {
    const response = await fetch(`${API_BASE_URL}/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    if (!response.ok) {
      throw new Error('Failed to create inventory item');
    }
    return response.json();
  },

  updateInventoryItem: async (id: number, item: UpdateInventoryItemDto): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    if (!response.ok) {
      throw new Error('Failed to update inventory item');
    }
  },

  deleteInventoryItem: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete inventory item');
    }
  },
};
