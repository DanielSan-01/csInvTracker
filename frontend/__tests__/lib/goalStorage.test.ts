import {
  saveGoal,
  getGoals,
  getGoalById,
  GOAL_STORAGE_KEY,
  GoalData,
} from '@/lib/goalStorage';
import { goalsApi, GoalDto } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const originalModule = jest.requireActual('@/lib/api');
  return {
    ...originalModule,
    goalsApi: {
      getGoals: jest.fn(),
      getGoalById: jest.fn(),
      upsertGoal: jest.fn(),
      deleteGoal: jest.fn(),
    },
  };
});

const mockedGoalsApi = goalsApi as jest.Mocked<typeof goalsApi>;

describe('goalStorage integration', () => {
  const baseGoal: GoalData = {
    id: 'goal-local',
    createdAt: '2025-11-21T00:00:00.000Z',
    updatedAt: '2025-11-21T00:00:00.000Z',
    skinName: 'AK-47 | Slate',
    targetPrice: 120,
    balance: 25,
    selectedTotal: 75,
    coverageTotal: 100,
    remainingAmount: 20,
    surplusAmount: 0,
    selectedItems: [
      {
        id: 1,
        inventoryItemId: null,
        skinName: 'Fallback Item A',
        price: 35,
        tradeProtected: false,
        imageUrl: undefined,
        weapon: 'AK-47',
        type: 'Rifle',
      },
      {
        id: 2,
        inventoryItemId: null,
        skinName: 'Fallback Item B',
        price: 40,
        tradeProtected: true,
        imageUrl: undefined,
        weapon: 'AK-47',
        type: 'Rifle',
      },
      {
        id: 42,
        inventoryItemId: undefined,
        skinName: 'Inventory Linked Item',
        price: 45,
        tradeProtected: false,
        imageUrl: undefined,
        weapon: 'AK-47',
        type: 'Rifle',
      },
    ],
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('saves and persists goals to session storage', () => {
    saveGoal(baseGoal);

    const storedRaw = window.sessionStorage.getItem(GOAL_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();

    const storedGoals = storedRaw ? (JSON.parse(storedRaw) as GoalData[]) : [];
    expect(storedGoals).toHaveLength(1);
    expect(storedGoals[0].id).toBe(baseGoal.id);
    expect(storedGoals[0].skinName).toBe(baseGoal.skinName);
  });

  it('retrieves goals via getGoals and getGoalById', () => {
    saveGoal(baseGoal);

    const allGoals = getGoals();
    expect(allGoals).toHaveLength(1);

    const [goal] = allGoals;
    expect(goal.id).toBe(baseGoal.id);

    const fetchedById = getGoalById(baseGoal.id);
    expect(fetchedById?.id).toBe(baseGoal.id);
    expect(fetchedById?.skinName).toBe(baseGoal.skinName);
  });

  it('overwrites existing goals when saving with same id', () => {
    saveGoal(baseGoal);
    const updatedGoal = { ...baseGoal, skinName: 'Updated Skin Name' };
    saveGoal(updatedGoal);

    const storedRaw = window.sessionStorage.getItem(GOAL_STORAGE_KEY);
    const storedGoals = storedRaw ? (JSON.parse(storedRaw) as GoalData[]) : [];
    expect(storedGoals).toHaveLength(1);
    expect(storedGoals[0].skinName).toBe('Updated Skin Name');
  });
});

// Note: Remote goal integration tests removed as goalStorage.ts only handles local storage.
// Remote goal fetching should be tested at the API/hook level, not in goalStorage tests.




