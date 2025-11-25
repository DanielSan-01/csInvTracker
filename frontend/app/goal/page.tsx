'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useInventory } from '@/hooks/useInventory';
import { formatCurrency } from '@/lib/utils';
import { inventoryItemsToCSItems } from '@/lib/dataConverter';
import { saveGoal, GoalData, createInventorySelectedItemKey } from '@/lib/goalStorage';
import type { InventoryItemDto, SkinDto } from '@/lib/api';
import GoalTargetSkinSection from './components/GoalTargetSkinSection';
import GoalInventorySection from './components/GoalInventorySection';
import GoalBalanceSection from './components/GoalBalanceSection';
import GoalSummarySection from './components/GoalSummarySection';
import GoalActionSection from './components/GoalActionSection';

export default function GoalPlannerPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { items, loading: inventoryLoading, error } = useInventory(user?.id);

  const [targetSkinName, setTargetSkinName] = useState('');
  const [targetSkinPrice, setTargetSkinPrice] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [existingBalance, setExistingBalance] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedSkin, setSelectedSkin] = useState<SkinDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const parsedTargetPrice = useMemo(() => {
    const value = parseFloat(targetSkinPrice.replace(',', '.'));
    return Number.isFinite(value) ? value : 0;
  }, [targetSkinPrice]);

  const parsedBalance = useMemo(() => {
    const value = parseFloat(existingBalance.replace(',', '.'));
    return Number.isFinite(value) ? value : 0;
  }, [existingBalance]);

  const filteredInventory = useMemo(() => {
    if (!inventorySearch.trim()) {
      return items;
    }

    const query = inventorySearch.trim().toLowerCase();
    return items.filter((item) =>
      item.skinName.toLowerCase().includes(query) ||
      (item.weapon?.toLowerCase().includes(query) ?? false)
    );
  }, [items, inventorySearch]);

  const selectedItems = useMemo(() => {
    const selectedMap = new Set(selectedItemIds);
    return items.filter((item) => selectedMap.has(item.id));
  }, [items, selectedItemIds]);

  const selectedTotal = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + (item.price ?? 0), 0);
  }, [selectedItems]);

  const coverageTotal = selectedTotal + parsedBalance;
  const remainingAmount = Math.max(parsedTargetPrice - coverageTotal, 0);
  const surplusAmount = Math.max(coverageTotal - parsedTargetPrice, 0);
  const inventoryAsCsItems = useMemo(() => inventoryItemsToCSItems(items), [items]);

  const handleToggleItem = useCallback((item: InventoryItemDto) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(item.id)) {
        return prev.filter((id) => id !== item.id);
      }
      return [...prev, item.id];
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedItemIds([]);
  }, []);

  const handleSkinSelection = useCallback((skin: SkinDto) => {
    setSelectedSkin(skin);
    setTargetSkinName(skin.name);

    if (skin.defaultPrice && skin.defaultPrice > 0) {
      setTargetSkinPrice(skin.defaultPrice.toFixed(2));
    }
  }, []);

  const handleClearSelectedSkin = useCallback(() => {
    setSelectedSkin(null);
  }, []);

  const handleAddGoal = async () => {
    if (isSavingGoal) return;

    if (!targetSkinName.trim()) {
      setFormError('Please select or enter the skin you want.');
      return;
    }

    if (parsedTargetPrice <= 0) {
      setFormError('Enter a target price greater than zero.');
      return;
    }

    setFormError(null);
    setIsSavingGoal(true);

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `goal-${Date.now()}`;

    const timestamp = new Date().toISOString();

    const goalData: GoalData = {
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      userId: user?.id,
      skinName: targetSkinName.trim(),
      skinId: selectedSkin?.id,
      skinImageUrl: selectedSkin?.dopplerPhaseImageUrl ?? selectedSkin?.imageUrl ?? null,
      skinAltImageUrl: selectedSkin?.imageUrl ?? null,
      skinRarity: selectedSkin?.rarity ?? null,
      skinType: selectedSkin?.type ?? null,
      skinWeapon: selectedSkin?.weapon ?? null,
      targetPrice: parsedTargetPrice,
      balance: parsedBalance,
      selectedTotal,
      coverageTotal,
      remainingAmount,
      surplusAmount,
      selectedItems: selectedItems.map((item) => ({
        id: createInventorySelectedItemKey(item.id),
        inventoryItemId: item.id,
        skinName: item.skinName,
        price: item.price ?? 0,
        tradeProtected: item.tradeProtected,
        imageUrl: item.imageUrl,
        weapon: item.weapon,
        type: item.type,
      })),
    };

    try {
      await saveGoal(goalData);
      router.push(`/goal/summary?goalId=${id}`);
    } catch (error) {
      console.error('Failed to save goal', error);
      setFormError('Failed to save goal. Please try again.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-20 pt-16 lg:px-10">
        <header className="flex flex-col gap-6 rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="type-label text-purple-300/80">Goal Planner</p>
              <h1 className="type-heading-xl text-white">Set a Goal for Your Next Skin</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 px-4 py-2 text-sm font-medium text-purple-100 transition-colors hover:border-purple-400/60 hover:bg-purple-500/10"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7M3 12h18" />
                </svg>
                Back to dashboard
              </Link>
              <div className="rounded-lg border border-gray-800 bg-gray-900/80 px-4 py-2 text-xs text-gray-300">
                {userLoading ? 'Checking Steam account...' : user ? (
                  <>
                    Planning for <span className="text-purple-300 font-medium">{user.username ?? user.steamId}</span>
                  </>
                ) : (
                  'You are browsing as a guest. Log in to use your inventory.'
                )}
              </div>
            </div>
          </div>

          <p className="type-body-sm text-gray-400 leading-relaxed">
            This planner helps you figure out how close you are to affording a new skin.
            Add your target skin, choose items you plan to sell, and include any balance you already have on trading sites.
            We’ll crunch the numbers and show what you still need (or how much surplus you have).
          </p>
        </header>

        <GoalTargetSkinSection
          step={1}
          selectedSkin={selectedSkin}
          inventoryItems={inventoryAsCsItems}
          onSkinSelect={handleSkinSelection}
          onClearSkin={handleClearSelectedSkin}
          targetSkinName={targetSkinName}
          onTargetSkinNameChange={setTargetSkinName}
          targetSkinPrice={targetSkinPrice}
          onTargetSkinPriceChange={setTargetSkinPrice}
          formatCurrency={formatCurrency}
        />

        <GoalInventorySection
          step={2}
          user={user}
          items={items}
          filteredItems={filteredInventory}
          selectedItemIds={selectedItemIds}
          onToggleItem={handleToggleItem}
          onClearSelection={handleClearSelection}
          inventoryLoading={inventoryLoading}
          inventorySearch={inventorySearch}
          onInventorySearchChange={setInventorySearch}
          selectedTotal={selectedTotal}
          error={error}
          formatCurrency={formatCurrency}
        />

        <GoalBalanceSection
          step={3}
          existingBalance={existingBalance}
          onBalanceChange={setExistingBalance}
        />

        <GoalSummarySection
          step={4}
          targetSkinName={targetSkinName}
          parsedTargetPrice={parsedTargetPrice}
          selectedTotal={selectedTotal}
          selectedItemCount={selectedItemIds.length}
          parsedBalance={parsedBalance}
          coverageTotal={coverageTotal}
          remainingAmount={remainingAmount}
          surplusAmount={surplusAmount}
          formatCurrency={formatCurrency}
        />

        <GoalActionSection
          formError={formError}
          onSubmit={handleAddGoal}
          isSaving={isSavingGoal}
          canSubmit={Boolean(targetSkinName.trim()) && parsedTargetPrice > 0}
        />
      </div>
    </div>
  );
}


