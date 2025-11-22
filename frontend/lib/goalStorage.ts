'use client';

import { goalsApi, GoalDto } from './api';

export const GOAL_STORAGE_KEY = 'csinvtracker-goals';

export interface SelectedGoalItem {
  id: string;
  inventoryItemId?: number | null;
  skinName: string;
  price: number;
  tradeProtected: boolean;
  imageUrl?: string | null;
  weapon?: string | null;
  type?: string | null;
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

const isBrowser = typeof window !== 'undefined';

const getSafeSessionStorage = () => {
  if (!isBrowser) {
    return null;
  }
  return window.sessionStorage;
};

const INVENTORY_SELECTED_ITEM_KEY_PREFIX = 'inventory-item';
const FALLBACK_SELECTED_ITEM_KEY_PREFIX = 'goal-selected';

export const createInventorySelectedItemKey = (inventoryItemId: number): string =>
  `${INVENTORY_SELECTED_ITEM_KEY_PREFIX}-${inventoryItemId}`;

type StoredSelectedGoalItem = {
  id?: string | number | null;
  inventoryItemId?: number | null;
  skinName: string;
  price: number;
  tradeProtected?: boolean;
  imageUrl?: string | null;
  weapon?: string | null;
  type?: string | null;
};

const parseInventoryIdFromKey = (id: string | null | undefined): number | null => {
  if (!id) {
    return null;
  }

  const keyPattern = new RegExp(`^${INVENTORY_SELECTED_ITEM_KEY_PREFIX}-(\\d+)$`);
  const match = keyPattern.exec(id);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isNaN(value) ? null : value;
};

const createFallbackSelectedItemKey = (
  goalId: string,
  index: number,
  item: Pick<StoredSelectedGoalItem, 'skinName' | 'price' | 'weapon' | 'type' | 'tradeProtected'>
): string => {
  const descriptor = [
    FALLBACK_SELECTED_ITEM_KEY_PREFIX,
    goalId,
    index,
    item.skinName ?? 'unknown',
    item.weapon ?? 'n/a',
    item.type ?? 'n/a',
    item.tradeProtected ? 'locked' : 'tradable',
    Math.round((item.price ?? 0) * 100),
  ];

  return descriptor.join('|');
};

const normalizeSelectedItems = (
  goalId: string,
  items: StoredSelectedGoalItem[] | undefined
): SelectedGoalItem[] => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map((rawItem, index) => {
    const rawId = rawItem.id;

    const inventoryItemId =
      typeof rawItem.inventoryItemId === 'number'
        ? rawItem.inventoryItemId
        : typeof rawId === 'number'
          ? rawId
          : typeof rawId === 'string'
            ? parseInventoryIdFromKey(rawId)
            : null;

    const normalizedId = typeof rawId === 'string' && rawId.trim().length > 0
      ? rawId
      : inventoryItemId !== null
        ? createInventorySelectedItemKey(inventoryItemId)
        : createFallbackSelectedItemKey(goalId, index, rawItem);

    return {
      id: normalizedId,
      inventoryItemId: inventoryItemId ?? null,
      skinName: rawItem.skinName,
      price: rawItem.price,
      tradeProtected: Boolean(rawItem.tradeProtected),
      imageUrl: rawItem.imageUrl ?? null,
      weapon: rawItem.weapon ?? null,
      type: rawItem.type ?? null,
    };
  });
};

const ensureSelectedItemIdentifiers = (goal: GoalData): GoalData => {
  const normalizedItems = normalizeSelectedItems(goal.id, goal.selectedItems as unknown as StoredSelectedGoalItem[]);

  return {
    ...goal,
    selectedItems: normalizedItems,
  };
};

const readLocalGoals = (): GoalData[] => {
  const storage = getSafeSessionStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(GOAL_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as GoalData[]) : [];
    return parsed.map((goal) => ensureSelectedItemIdentifiers(goal));
  } catch (error) {
    console.error('Failed to load goals', error);
    return [];
  }
};

const writeLocalGoals = (goals: GoalData[]) => {
  const storage = getSafeSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('Failed to save goal', error);
  }
};

const toGoalDto = (goal: GoalData): GoalDto => ({
  id: goal.id,
  createdAt: goal.createdAt,
  updatedAt: goal.updatedAt ?? goal.createdAt,
  userId: goal.userId ?? null,
  skinName: goal.skinName,
  skinId: goal.skinId ?? null,
  targetPrice: goal.targetPrice,
  balance: goal.balance,
  selectedTotal: goal.selectedTotal,
  coverageTotal: goal.coverageTotal,
  remainingAmount: goal.remainingAmount,
  surplusAmount: goal.surplusAmount,
  skinImageUrl: goal.skinImageUrl ?? null,
  skinAltImageUrl: goal.skinAltImageUrl ?? null,
  skinRarity: goal.skinRarity ?? null,
  skinType: goal.skinType ?? null,
  skinWeapon: goal.skinWeapon ?? null,
  selectedItems: goal.selectedItems.map((item) => ({
    inventoryItemId:
      item.inventoryItemId ??
      (typeof item.id === 'string' ? parseInventoryIdFromKey(item.id) : null),
    skinName: item.skinName,
    price: item.price,
    tradeProtected: item.tradeProtected,
    imageUrl: item.imageUrl ?? null,
    weapon: item.weapon ?? null,
    type: item.type ?? null,
  })),
});

const fromGoalDto = (dto: GoalDto): GoalData => ({
  id: dto.id,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  userId: dto.userId ?? undefined,
  skinName: dto.skinName,
  skinId: dto.skinId ?? undefined,
  skinImageUrl: dto.skinImageUrl ?? undefined,
  skinAltImageUrl: dto.skinAltImageUrl ?? undefined,
  skinRarity: dto.skinRarity ?? undefined,
  skinType: dto.skinType ?? undefined,
  skinWeapon: dto.skinWeapon ?? undefined,
  targetPrice: dto.targetPrice,
  balance: dto.balance,
  selectedTotal: dto.selectedTotal,
  coverageTotal: dto.coverageTotal,
  remainingAmount: dto.remainingAmount,
  surplusAmount: dto.surplusAmount,
  selectedItems: dto.selectedItems.map((item) => ({
    id: item.inventoryItemId != null ? createInventorySelectedItemKey(item.inventoryItemId) : '',
    inventoryItemId: item.inventoryItemId ?? null,
    skinName: item.skinName,
    price: item.price,
    tradeProtected: item.tradeProtected,
    imageUrl: item.imageUrl ?? null,
    weapon: item.weapon ?? null,
    type: item.type ?? null,
  })),
});

export async function saveGoal(goal: GoalData): Promise<GoalData> {
  const normalizedGoal = ensureSelectedItemIdentifiers(goal);

  if (goal.userId) {
    const saved = await goalsApi.upsertGoal(toGoalDto(normalizedGoal));
    return ensureSelectedItemIdentifiers(fromGoalDto(saved));
  }

  const goals = readLocalGoals();
  const withoutCurrent = goals.filter((existing) => existing.id !== normalizedGoal.id);
  withoutCurrent.unshift(normalizedGoal);
  writeLocalGoals(withoutCurrent);
  return normalizedGoal;
}

export async function fetchGoals(userId?: number): Promise<GoalData[]> {
  if (userId) {
    const goals = await goalsApi.getGoals(userId);
    return goals.map((goal) => ensureSelectedItemIdentifiers(fromGoalDto(goal)));
  }
  return readLocalGoals();
}

export async function fetchGoalById(id: string, userId?: number): Promise<GoalData | null> {
  if (userId) {
    try {
      const goal = await goalsApi.getGoalById(id);
      return ensureSelectedItemIdentifiers(fromGoalDto(goal));
    } catch (error) {
      console.error('Failed to fetch goal', error);
      return null;
    }
  }
  return readLocalGoals().find((goal) => goal.id === id) ?? null;
}

export async function deleteGoal(id: string, userId?: number): Promise<void> {
  if (userId) {
    await goalsApi.deleteGoal(id);
    return;
  }

  const goals = readLocalGoals().filter((goal) => goal.id !== id);
  writeLocalGoals(goals);
}
