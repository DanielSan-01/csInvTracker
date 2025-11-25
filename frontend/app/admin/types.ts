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


