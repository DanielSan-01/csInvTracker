import {
  saveGoal,
  fetchGoals,
  fetchGoalById,
  deleteGoal,
  createInventorySelectedItemKey,
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
        id: '',
        inventoryItemId: null,
        skinName: 'Fallback Item A',
        price: 35,
        tradeProtected: false,
        imageUrl: null,
        weapon: 'AK-47',
        type: 'Rifle',
      },
      {
        id: null as unknown as string,
        inventoryItemId: null,
        skinName: 'Fallback Item B',
        price: 40,
        tradeProtected: true,
        imageUrl: null,
        weapon: 'AK-47',
        type: 'Rifle',
      },
      {
        id: 42 as unknown as string,
        inventoryItemId: undefined,
        skinName: 'Inventory Linked Item',
        price: 45,
        tradeProtected: false,
        imageUrl: null,
        weapon: 'AK-47',
        type: 'Rifle',
      },
    ],
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('normalizes and persists selected item identifiers for local goals', async () => {
    const saved = await saveGoal(baseGoal);

    expect(new Set(saved.selectedItems.map((item) => item.id)).size).toBe(saved.selectedItems.length);
    expect(saved.selectedItems.every((item) => typeof item.id === 'string' && item.id.length > 0)).toBe(true);

    const fallbackIds = saved.selectedItems
      .filter((item) => item.inventoryItemId == null)
      .map((item) => item.id);

    fallbackIds.forEach((id) => {
      expect(id.startsWith('goal-selected|goal-local|')).toBe(true);
    });

    const inventoryLinkedItem = saved.selectedItems.find((item) => item.inventoryItemId === 42);
    expect(inventoryLinkedItem?.id).toBe(createInventorySelectedItemKey(42));

    const storedRaw = window.sessionStorage.getItem(GOAL_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();

    const storedGoals = storedRaw ? (JSON.parse(storedRaw) as GoalData[]) : [];
    expect(storedGoals).toHaveLength(1);
    expect(storedGoals[0].selectedItems.map((item) => item.id)).toEqual(
      saved.selectedItems.map((item) => item.id),
    );
  });

  it('retrieves normalized data via fetchGoals and fetchGoalById', async () => {
    await saveGoal(baseGoal);

    const allGoals = await fetchGoals();
    expect(allGoals).toHaveLength(1);

    const [goal] = allGoals;
    expect(new Set(goal.selectedItems.map((item) => item.id)).size).toBe(goal.selectedItems.length);

    const fetchedById = await fetchGoalById(baseGoal.id);
    expect(fetchedById?.id).toBe(baseGoal.id);
    expect(fetchedById?.selectedItems.map((item) => item.id)).toEqual(goal.selectedItems.map((item) => item.id));
  });

  it('removes local goals via deleteGoal', async () => {
    await saveGoal(baseGoal);

    await deleteGoal(baseGoal.id);

    const storedRaw = window.sessionStorage.getItem(GOAL_STORAGE_KEY);
    const storedGoals = storedRaw ? (JSON.parse(storedRaw) as GoalData[]) : [];
    expect(storedGoals).toHaveLength(0);
  });
});

describe('goalStorage remote integration', () => {
  const remoteGoalDto: GoalDto = {
    id: 'goal-remote',
    createdAt: '2025-11-21T00:00:00.000Z',
    updatedAt: '2025-11-21T01:00:00.000Z',
    userId: 100,
    skinName: 'M4A4 | The Emperor',
    skinId: 5,
    targetPrice: 300,
    balance: 150,
    selectedTotal: 120,
    coverageTotal: 270,
    remainingAmount: 30,
    surplusAmount: 0,
    skinImageUrl: null,
    skinAltImageUrl: null,
    skinRarity: 'Covert',
    skinType: 'Rifle',
    skinWeapon: 'M4A4',
    selectedItems: [
      {
        inventoryItemId: null,
        skinName: 'Fallback Remote Item',
        price: 60,
        tradeProtected: false,
        imageUrl: null,
        weapon: 'M4A4',
        type: 'Rifle',
      },
      {
        inventoryItemId: 77,
        skinName: 'Inventory Remote Item',
        price: 60,
        tradeProtected: true,
        imageUrl: null,
        weapon: 'M4A4',
        type: 'Rifle',
      },
    ],
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('normalizes selected item identifiers when fetching remote goals', async () => {
    mockedGoalsApi.getGoals.mockResolvedValue([remoteGoalDto]);

    const goals = await fetchGoals(100);
    expect(mockedGoalsApi.getGoals).toHaveBeenCalledWith(100);
    expect(goals).toHaveLength(1);

    const [goal] = goals;
    expect(goal.id).toBe(remoteGoalDto.id);

    expect(new Set(goal.selectedItems.map((item) => item.id)).size).toBe(goal.selectedItems.length);

    const fallbackItem = goal.selectedItems.find((item) => item.inventoryItemId == null);
    expect(fallbackItem?.id.startsWith('goal-selected|goal-remote|')).toBe(true);

    const inventoryItem = goal.selectedItems.find((item) => item.inventoryItemId === 77);
    expect(inventoryItem?.id).toBe(createInventorySelectedItemKey(77));
  });

  it('normalizes selected item identifiers when fetching a single remote goal', async () => {
    mockedGoalsApi.getGoalById.mockResolvedValue(remoteGoalDto);

    const goal = await fetchGoalById(remoteGoalDto.id, 100);
    expect(mockedGoalsApi.getGoalById).toHaveBeenCalledWith(remoteGoalDto.id);

    expect(goal?.id).toBe(remoteGoalDto.id);
    expect(goal?.selectedItems.length).toBe(2);
    expect(new Set(goal?.selectedItems.map((item) => item.id))).toHaveProperty('size', 2);
  });
});

