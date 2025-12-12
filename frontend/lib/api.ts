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
  marketHashName?: string;
  priceExceedsSteamLimit?: boolean;
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
  marketHashName?: string | null;
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
  priceExceedsSteamLimit: boolean;
}

export interface InventoryStatsDto {
  totalItems: number;
  marketValue: number;
  acquisitionCost: number;
  netProfit: number;
  averageProfitPercent?: number | null;
}

export interface FloatStatus {
  isProcessing: boolean;
  pending: number;
  currentInventoryItemId?: number | null;
  currentAssetId?: string | null;
  currentName?: string | null;
  startedAt?: string | null;
}

export interface InventoryValueHistoryDto {
  date: string; // ISO date string
  totalValue: number;
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
  id?: string | null;
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
  tradableAfter?: string; // ISO date string
  stickers?: CreateStickerDto[];
}

export interface UpdateInventoryItemDto {
  float: number;
  paintSeed?: number;
  price: number;
  cost?: number;
  imageUrl?: string;
  tradeProtected: boolean;
  tradableAfter?: string; // ISO date string
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
      // Try to get token from cookie (set by Next.js API route)
      // For cross-domain requests, we may need to send it in Authorization header
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Try to get token from non-HttpOnly cookie or localStorage
      // This is a fallback for cross-domain cookie issues
      let token: string | null = null;
      if (typeof document !== 'undefined') {
        // Try to read from cookie first
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'auth_token_client' && value) {
            token = value;
            // Also store in localStorage as backup
            localStorage.setItem('auth_token', value);
            break;
          }
        }
        
        // Fallback to localStorage if cookie not found
        if (!token) {
          token = localStorage.getItem('auth_token');
        }
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('Sending token in Authorization header');
        } else {
          console.warn('No token found in cookies or localStorage');
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include', // Include cookies
        headers,
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          // Clear invalid token from localStorage if present
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('auth_token');
          }
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
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Logout route request failed, falling back to local cleanup:', error);
    } finally {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
    }
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

  // New method: Refresh from Steam (fetches and imports in one call, handles pagination on backend)
  refreshFromSteam: async (
    userId?: number
  ): Promise<SteamInventoryImportResult> => {
    const url = new URL(`${API_BASE_URL}/inventory/refresh-from-steam`);
    if (userId) {
      url.searchParams.append('userId', userId.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      // Try to parse as JSON first
      let errorMessage = `Failed to refresh Steam inventory: ${response.status} ${response.statusText}`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorJson = await response.json();
          // Backend returns error objects with 'error' and 'details' fields
          if (errorJson.error) {
            errorMessage = errorJson.error;
            if (errorJson.details) {
              errorMessage += ` - ${errorJson.details}`;
            }
            // Include the full error object as a JSON string for parsing
            errorMessage = JSON.stringify(errorJson);
          } else if (typeof errorJson === 'string') {
            errorMessage = errorJson;
          }
        } else {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
      } catch (parseError) {
        // If parsing fails, try to get text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch (textError) {
          // Use default error message
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  refreshFloats: async (
    userId?: number
  ): Promise<SteamInventoryImportResult> => {
    const url = new URL(`${API_BASE_URL}/inventory/refresh-floats`);
    if (userId) {
      url.searchParams.append('userId', userId.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = `Failed to refresh floats: ${response.status} ${response.statusText}`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorJson = await response.json();
          if (errorJson.error) {
            errorMessage = errorJson.error;
            if (errorJson.details) {
              errorMessage += ` - ${errorJson.details}`;
            }
            errorMessage = JSON.stringify(errorJson);
          } else if (typeof errorJson === 'string') {
            errorMessage = errorJson;
          }
        } else {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
      } catch {
        const errorText = await response.text().catch(() => '');
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
    }

    return response.json();
  },

  getFloatStatus: async (): Promise<FloatStatus> => {
    const response = await fetch(`${API_BASE_URL}/inventory/float-status`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch float status');
    }

    return response.json();
  },

  // Refresh market prices for existing inventory items
  refreshPrices: async (
    userId?: number,
    markets?: string[]
  ): Promise<RefreshPricesResult> => {
    const url = new URL(`${API_BASE_URL}/inventory/refresh-prices`);
    if (userId) {
      url.searchParams.append('userId', userId.toString());
    }
    if (markets && markets.length > 0) {
      markets.forEach(market => {
        if (market && market.trim().length > 0) {
          url.searchParams.append('markets', market.trim().toUpperCase());
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      // Try to parse as JSON first
      let errorMessage = `Failed to refresh prices: `;
      try {
        const errorData = await response.json();
        errorMessage += errorData.error || errorData.details || JSON.stringify(errorData);
      } catch {
        errorMessage += await response.text();
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },
};

export interface RefreshPricesResult {
  totalItems: number;
  updated: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
  rateLimited?: boolean;
  infoMessages?: string[];
}

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
    
    // Try to get token from localStorage for Authorization header (cross-domain support)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (typeof document !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    const response = await fetch(url.toString(), {
      credentials: 'include',
      headers,
    });
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

  getValueHistory: async (userId: number): Promise<InventoryValueHistoryDto[]> => {
    const url = new URL(`${API_BASE_URL}/inventory/value-history`);
    url.searchParams.append('userId', userId.toString());
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch inventory value history');
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

    // Try to get token from localStorage for Authorization header (cross-domain support)
    const headers: HeadersInit = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch goals');
    }
    return response.json();
  },

  getGoalById: async (id: string): Promise<GoalDto> => {
    // Try to get token from localStorage for Authorization header (cross-domain support)
    const headers: HeadersInit = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}/goals/${id}`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch goal');
    }
    return response.json();
  },

  upsertGoal: async (goal: GoalDto): Promise<GoalDto> => {
    // Try to get token from localStorage for Authorization header (cross-domain support)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(goal),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save goal: ${errorText}`);
    }
    return response.json();
  },

  deleteGoal: async (id: string): Promise<void> => {
    // Try to get token from localStorage for Authorization header (cross-domain support)
    const headers: HeadersInit = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}/goals/${id}`, {
      method: 'DELETE',
      headers,
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

    // Try to get token from localStorage for Authorization header (cross-domain support)
    const headers: HeadersInit = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch loadouts');
    }
    return response.json();
  },

  upsertLoadout: async (loadout: LoadoutDto): Promise<LoadoutDto> => {
    // Try to get token from localStorage for Authorization header (cross-domain support)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}/loadouts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(loadout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.message || 'Failed to save loadout');
    }

    return response.json();
  },

  deleteLoadout: async (id: string): Promise<void> => {
    // Try to get token from localStorage for Authorization header (cross-domain support)
    const headers: HeadersInit = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${API_BASE_URL}/loadouts/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to delete loadout');
    }
  },
};
