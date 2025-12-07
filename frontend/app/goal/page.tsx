'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useInventory } from '@/hooks/useInventory';
import { formatCurrency } from '@/lib/utils';
import { inventoryItemsToCSItems } from '@/lib/dataConverter';
import { goalsApi, GoalDto } from '@/lib/api';
import type { InventoryItemDto, SkinDto } from '@/lib/api';
import Navbar from '@/app/components/Navbar';
import SteamLoginButton from '@/app/components/SteamLoginButton';
import GoalTargetSkinSection from './components/GoalTargetSkinSection';
import GoalInventorySection from './components/GoalInventorySection';
import GoalBalanceSection from './components/GoalBalanceSection';
import GoalSummarySection from './components/GoalSummarySection';
import GoalActionSection from './components/GoalActionSection';
import GoalAffordabilityPanel from './components/GoalAffordabilityPanel';

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

    if (!user?.id) {
      setFormError('Please log in to save your goal.');
      return;
    }

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

    const goalData: GoalDto = {
      id: null, // null for new goals - backend will generate it
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user.id,
      skinName: targetSkinName.trim(),
      skinId: selectedSkin?.id ?? null,
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
        inventoryItemId: item.id,
        skinName: item.skinName,
        price: item.price ?? 0,
        tradeProtected: item.tradeProtected,
        imageUrl: item.imageUrl ?? null,
        weapon: item.weapon ?? null,
        type: item.type ?? null,
      })),
    };

    try {
      const savedGoal = await goalsApi.upsertGoal(goalData);
      router.push(`/goal/summary?goalId=${savedGoal.id}`);
    } catch (error) {
      console.error('Failed to save goal', error);
      setFormError(error instanceof Error ? error.message : 'Failed to save goal. Please try again.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar
        isAuthenticated={!!user}
        authControl={<SteamLoginButton />}
      />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-20 pt-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
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

          {/* Affordability Panel - Sticky on the right */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-8">
              <GoalAffordabilityPanel
                targetSkinName={targetSkinName}
                targetSkinImageUrl={selectedSkin?.dopplerPhaseImageUrl ?? selectedSkin?.imageUrl ?? null}
                targetPrice={parsedTargetPrice}
                selectedTotal={selectedTotal}
                parsedBalance={parsedBalance}
                remainingAmount={remainingAmount}
                surplusAmount={surplusAmount}
                formatCurrency={formatCurrency}
                onTargetPriceChange={(newPrice) => {
                  setTargetSkinPrice(newPrice.toFixed(2));
                }}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


