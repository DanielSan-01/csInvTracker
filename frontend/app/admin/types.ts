export type TabType = 'stats' | 'users' | 'skins';

export interface RecentActivity {
  userName: string;
  skinName: string;
  action: string;
  timestamp: string;
}

export interface AdminStats {
  totalUsers: number;
  totalSkins: number;
  totalInventoryItems: number;
  totalInventoryValue: number;
  recentActivity: RecentActivity[];
}

export interface AdminUser {
  id: number;
  steamId: string;
  username?: string;
  createdAt: string;
  lastLoginAt: string;
  itemCount: number;
  totalValue: number;
  totalCost: number;
}

export interface AdminInventoryPage {
  total: number;
  skip: number;
  take: number;
  items: AdminInventoryItem[];
}

export interface AdminInventoryItem {
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
  stickers?: {
    id?: number;
    name: string;
    price?: number;
    slot?: number;
    imageUrl?: string;
  }[];
  priceExceedsSteamLimit: boolean;
}

export interface NewSkinFormState {
  name: string;
  rarity: string;
  type: string;
  collection: string;
  weapon: string;
  imageUrl: string;
  defaultPrice: string;
  paintIndex: string;
}


