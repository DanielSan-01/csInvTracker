// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027/api';

// Types matching backend DTOs
export interface SkinDto {
  id: number;
  name: string;
  rarity: string;
  type: string;
  imageUrl?: string;
  defaultPrice?: number;
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
}

export interface CreateInventoryItemDto {
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
  async getAll(search?: string): Promise<SkinDto[]> {
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

  async getById(id: number): Promise<SkinDto> {
    const response = await fetch(`${API_BASE_URL}/skins/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch skin');
    }
    return response.json();
  },
};

// Inventory API
export const inventoryApi = {
  async getAll(): Promise<InventoryItemDto[]> {
    const response = await fetch(`${API_BASE_URL}/inventory`);
    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }
    return response.json();
  },

  async getById(id: number): Promise<InventoryItemDto> {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch inventory item');
    }
    return response.json();
  },

  async create(item: CreateInventoryItemDto): Promise<InventoryItemDto> {
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

  async update(id: number, item: UpdateInventoryItemDto): Promise<InventoryItemDto> {
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

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete inventory item');
    }
  },
};
