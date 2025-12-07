'use client';

export const GOAL_STORAGE_KEY = 'csinvtracker-goals';

export interface SelectedGoalItem {
  id: number;
  skinName: string;
  price: number;
  tradeProtected: boolean;
  imageUrl?: string;
  weapon?: string | null;
  type?: string;
}

export interface GoalData {
  id: string;
  createdAt: string;
  updatedAt?: string;
  userId?: number;
  skinName: string;
  skinId?: number;
  skinImageUrl?: string | null;
  skinRarity?: string | null;
  skinType?: string | null;
  skinWeapon?: string | null;
  skinAltImageUrl?: string | null;
  targetPrice: number;
  balance: number;
  selectedTotal: number;
  coverageTotal: number;
  remainingAmount: number;
  surplusAmount: number;
  selectedItems: SelectedGoalItem[];
}

const getSafeSessionStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage;
};

export function saveGoal(goal: GoalData): void {
  const storage = getSafeSessionStorage();
  if (!storage) return;

  try {
    const raw = storage.getItem(GOAL_STORAGE_KEY);
    const goals: GoalData[] = raw ? JSON.parse(raw) : [];
    const filtered = goals.filter(existing => existing.id !== goal.id);
    filtered.unshift(goal);
    storage.setItem(GOAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to save goal', error);
  }
}

export function getGoals(): GoalData[] {
  const storage = getSafeSessionStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(GOAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to load goals', error);
    return [];
  }
}

export function getGoalById(id: string): GoalData | null {
  return getGoals().find(goal => goal.id === id) ?? null;
}

// Async functions that can fetch from API or use local storage
export async function fetchGoals(userId?: number): Promise<GoalData[]> {
  // If userId is provided, try to fetch from API
  if (userId) {
    try {
      const { goalsApi } = await import('./api');
      const apiGoals = await goalsApi.getGoals(userId);
      // Convert API DTOs to GoalData format
      return apiGoals.map((goal): GoalData => ({
        id: goal.id ?? '', // Convert null/undefined to empty string for GoalData
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt ?? undefined,
        userId: goal.userId ?? undefined,
        skinName: goal.skinName,
        skinId: goal.skinId ?? undefined,
        skinImageUrl: goal.skinImageUrl ?? undefined,
        skinRarity: goal.skinRarity ?? undefined,
        skinType: goal.skinType ?? undefined,
        skinWeapon: goal.skinWeapon ?? undefined,
        skinAltImageUrl: goal.skinAltImageUrl ?? undefined,
        targetPrice: goal.targetPrice,
        balance: goal.balance,
        selectedTotal: goal.selectedTotal,
        coverageTotal: goal.coverageTotal,
        remainingAmount: goal.remainingAmount,
        surplusAmount: goal.surplusAmount,
        selectedItems: goal.selectedItems.map(item => ({
          id: item.inventoryItemId ?? 0,
          skinName: item.skinName,
          price: item.price,
          tradeProtected: item.tradeProtected,
          imageUrl: item.imageUrl ?? undefined,
          weapon: item.weapon ?? undefined,
          type: item.type ?? undefined,
        })),
      }));
    } catch (error) {
      console.error('Failed to fetch goals from API, falling back to local storage', error);
      // Fall back to local storage
      return getGoals();
    }
  }
  
  // No userId, use local storage
  return getGoals();
}

export async function fetchGoalById(id: string, userId?: number): Promise<GoalData | null> {
  // If userId is provided, try to fetch from API
  if (userId) {
    try {
      const { goalsApi } = await import('./api');
      const goal = await goalsApi.getGoalById(id);
      // Convert API DTO to GoalData format
      return {
        id: goal.id ?? '', // Convert null/undefined to empty string for GoalData
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt ?? undefined,
        userId: goal.userId ?? undefined,
        skinName: goal.skinName,
        skinId: goal.skinId ?? undefined,
        skinImageUrl: goal.skinImageUrl ?? undefined,
        skinRarity: goal.skinRarity ?? undefined,
        skinType: goal.skinType ?? undefined,
        skinWeapon: goal.skinWeapon ?? undefined,
        skinAltImageUrl: goal.skinAltImageUrl ?? undefined,
        targetPrice: goal.targetPrice,
        balance: goal.balance,
        selectedTotal: goal.selectedTotal,
        coverageTotal: goal.coverageTotal,
        remainingAmount: goal.remainingAmount,
        surplusAmount: goal.surplusAmount,
        selectedItems: goal.selectedItems.map(item => ({
          id: item.inventoryItemId ?? 0,
          skinName: item.skinName,
          price: item.price,
          tradeProtected: item.tradeProtected,
          imageUrl: item.imageUrl ?? undefined,
          weapon: item.weapon ?? undefined,
          type: item.type ?? undefined,
        })),
      };
    } catch (error) {
      console.error('Failed to fetch goal from API, falling back to local storage', error);
      // Fall back to local storage
      return getGoalById(id);
    }
  }
  
  // No userId, use local storage
  return getGoalById(id);
}

