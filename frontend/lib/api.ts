// Dynamically determine API URL based on current host
const getApiBaseUrl = () => {
  // Always use environment variable if set (for production)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // In browser, use current host (for local development)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Use HTTPS in production, HTTP for localhost
    const protocol = host === 'localhost' || host === '127.0.0.1' ? 'http' : 'https';
    return `${protocol}://${host}:5027/api`;
  }
  
  // Fallback for SSR (local development)
  return 'http://localhost:5027/api';
};

const API_BASE_URL = getApiBaseUrl();

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

export interface StickerDto {
  id: number;
  name: string;
  price?: number;
  slot?: number;
  imageUrl?: string;
}

export interface StickerCatalogDto {
  name: string;
  imageUrl?: string;
  averagePrice?: number;
}

export interface InventoryItemDto {
  id: number;
  skinId: number;
  skinName: string;
  rarity: string;
  type: string;
  collection?: string | null;
  weapon?: string | null;
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
  stickers?: StickerDto[];
}

export interface InventoryStatsDto {
  totalItems: number;
  marketValue: number;
  acquisitionCost: number;
  netProfit: number;
  averageProfitPercent?: number | null;
}

export interface GoalSelectedItemDto {
  inventoryItemId?: number | null;
  skinName: string;
  price: number;
  tradeProtected: boolean;
  imageUrl?: string | null;
  weapon?: string | null;
  type?: string | null;
}

export interface GoalDto {
  id: string;
  createdAt: string;
  updatedAt?: string;
  userId?: number | null;
  skinName: string;
  skinId?: number | null;
  targetPrice: number;
  balance: number;
  selectedTotal: number;
  coverageTotal: number;
  remainingAmount: number;
  surplusAmount: number;
  skinImageUrl?: string | null;
  skinAltImageUrl?: string | null;
  skinRarity?: string | null;
  skinType?: string | null;
  skinWeapon?: string | null;
  selectedItems: GoalSelectedItemDto[];
}

export interface CreateStickerDto {
  name: string;
  price?: number;
  slot?: number;
  imageUrl?: string;
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
  stickers?: CreateStickerDto[];
}

export interface UpdateInventoryItemDto {
  float: number;
  paintSeed?: number;
  price: number;
  cost?: number;
  imageUrl?: string;
  tradeProtected: boolean;
  stickers?: CreateStickerDto[];
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
  displayName?: string;
  avatarUrl?: string;
  avatarMediumUrl?: string;
  avatarFullUrl?: string;
  profileUrl?: string;
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

// Auth API
export interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include', // Include cookies
      });
      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error('Failed to get current user');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  },

  logout: async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};

// Steam Inventory Import API
export interface SteamInventoryImportItem {
  assetId: string;
  marketHashName: string;
  name: string;
  imageUrl?: string;
  marketable: boolean;
  tradable: boolean;
  descriptions?: Array<{ type: string; value?: string; color?: string }>;
  tags?: Array<{ category: string; localizedTagName: string }>;
}

export interface SteamInventoryImportResult {
  totalItems: number;
  imported: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
}

export const steamInventoryApi = {
  importFromSteam: async (
    userId: number,
    items: SteamInventoryImportItem[]
  ): Promise<SteamInventoryImportResult> => {
    const response = await fetch(`${API_BASE_URL}/inventory/import-from-steam`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId,
        items,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to import Steam inventory: ${error}`);
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

// Stickers API
export const stickersApi = {
  getStickers: async (search?: string): Promise<StickerCatalogDto[]> => {
    const url = new URL(`${API_BASE_URL}/stickers`);
    if (search) {
      url.searchParams.append('search', search);
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch stickers');
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

  updateInventoryItem: async (id: number, item: UpdateInventoryItemDto): Promise<InventoryItemDto> => {
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
    return response.json();
  },

  deleteInventoryItem: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete inventory item');
    }
  },

  getStats: async (userId?: number): Promise<InventoryStatsDto> => {
    const url = new URL(`${API_BASE_URL}/inventory/stats`);
    if (userId) {
      url.searchParams.append('userId', userId.toString());
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch inventory stats');
    }
    return response.json();
  },
};

// Goals API
export const goalsApi = {
  getGoals: async (userId?: number): Promise<GoalDto[]> => {
    const url = new URL(`${API_BASE_URL}/goals`);
    if (userId) {
      url.searchParams.append('userId', userId.toString());
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch goals');
    }
    return response.json();
  },

  getGoalById: async (id: string): Promise<GoalDto> => {
    const response = await fetch(`${API_BASE_URL}/goals/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch goal');
    }
    return response.json();
  },

  upsertGoal: async (goal: GoalDto): Promise<GoalDto> => {
    const response = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goal),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.message || 'Failed to save goal');
    }

    return response.json();
  },

  deleteGoal: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete goal');
    }
  },
};

export interface LoadoutEntryDto {
  slotKey: string;
  team: 'CT' | 'T';
  inventoryItemId?: number | null;
  skinId?: number | null;
  skinName: string;
  imageUrl?: string | null;
  weapon?: string | null;
  type?: string | null;
}

export interface LoadoutDto {
  id?: string;
  userId: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  entries: LoadoutEntryDto[];
}

export const loadoutsApi = {
  getLoadouts: async (userId?: number): Promise<LoadoutDto[]> => {
    const url = new URL(`${API_BASE_URL}/loadouts`);
    if (userId) {
      url.searchParams.append('userId', userId.toString());
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch loadouts');
    }
    return response.json();
  },

  upsertLoadout: async (loadout: LoadoutDto): Promise<LoadoutDto> => {
    const response = await fetch(`${API_BASE_URL}/loadouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loadout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.message || 'Failed to save loadout');
    }

    return response.json();
  },

  deleteLoadout: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/loadouts/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete loadout');
    }
  },
};
