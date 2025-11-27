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


