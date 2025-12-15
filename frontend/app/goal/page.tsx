'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useInventory } from '@/hooks/useInventory';
import { formatCurrency } from '@/lib/utils';
import { inventoryItemsToCSItems } from '@/lib/dataConverter';
import { goalsApi, GoalDto } from '@/lib/api';
import { fetchGoals, GoalData } from '@/lib/goalStorage';
import type { InventoryItemDto, SkinDto } from '@/lib/api';
import Navbar from '@/app/components/Navbar';
import SteamLoginButton from '@/app/components/SteamLoginButton';
import GoalTargetSkinSection from './components/GoalTargetSkinSection';
import GoalInventorySection from './components/GoalInventorySection';
import GoalBalanceSection from './components/GoalBalanceSection';
import GoalSummarySection from './components/GoalSummarySection';
import GoalActionSection from './components/GoalActionSection';
import GoalAffordabilityPanel from './components/GoalAffordabilityPanel';
import TargetSkinCard from '@/app/components/TargetSkinCard';
import StatCard from '@/app/components/StatCard';
import InventoryListCard from '@/app/components/InventoryListCard';
import Link from 'next/link';

export default function GoalPlannerPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { items, loading: inventoryLoading, error } = useInventory(user?.id);
  
  const [savedGoal, setSavedGoal] = useState<GoalData | null>(null);
  const [loadingGoal, setLoadingGoal] = useState(true);

  const [targetSkinName, setTargetSkinName] = useState('');
  const [targetSkinPrice, setTargetSkinPrice] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [existingBalance, setExistingBalance] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedSkin, setSelectedSkin] = useState<SkinDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number>>({});

  // Load saved goal on mount
  useEffect(() => {
    const loadSavedGoal = async () => {
      if (!user?.id) {
        setLoadingGoal(false);
        return;
      }

      try {
        setLoadingGoal(true);
        const goals = await fetchGoals(user.id);
        if (goals.length > 0) {
          setSavedGoal(goals[0]); // Show the most recent goal
        } else {
          setSavedGoal(null);
        }
      } catch (error) {
        console.error('Failed to load saved goal', error);
        setSavedGoal(null);
      } finally {
        setLoadingGoal(false);
      }
    };

    loadSavedGoal();
  }, [user?.id]);

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

  const getEffectivePrice = useCallback(
    (item: InventoryItemDto) => {
      const override = priceOverrides[item.id];
      if (Number.isFinite(override)) {
        return override;
      }
      return item.price ?? 0;
    },
    [priceOverrides]
  );

  const selectedTotal = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + getEffectivePrice(item), 0);
  }, [selectedItems, getEffectivePrice]);

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

  const handleOverrideChange = useCallback((itemId: number, value: number | null) => {
    setPriceOverrides((prev) => {
      const next = { ...prev };
      if (value === null || Number.isNaN(value)) {
        delete next[itemId];
      } else {
        next[itemId] = value;
      }
      return next;
    });
  }, []);

  const handleClearAllOverrides = useCallback(() => {
    setPriceOverrides({});
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
        price: getEffectivePrice(item),
        tradeProtected: item.tradeProtected,
        imageUrl: item.imageUrl ?? null,
        weapon: item.weapon ?? null,
        type: item.type ?? null,
      })),
    };

    try {
      const savedGoal = await goalsApi.upsertGoal(goalData);
      // Reload the saved goal to show the summary
      const goals = await fetchGoals(user.id);
      if (goals.length > 0) {
        setSavedGoal(goals[0]);
        setShowNewGoalForm(false);
        // Reset form
        setTargetSkinName('');
        setTargetSkinPrice('');
        setSelectedItemIds([]);
        setExistingBalance('');
        setSelectedSkin(null);
      }
    } catch (error) {
      console.error('Failed to save goal', error);
      setFormError(error instanceof Error ? error.message : 'Failed to save goal. Please try again.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  // Show loading state while checking for saved goal
  if (loadingGoal) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar
          isAuthenticated={!!user}
          authControl={<SteamLoginButton />}
        />
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3 text-gray-300">
            <svg className="h-8 w-8 animate-spin text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2.5A9.5 9.5 0 003.5 12H4zm2 5.291A7.962 7.962 0 014 12H2.5c0 3.31 1.344 6.31 3.52 8.477L6 17.291z" />
            </svg>
            <p className="text-sm">Loading your goal…</p>
          </div>
        </div>
      </div>
    );
  }

  // Show saved goal summary if it exists and user hasn't clicked to create new goal
  if (savedGoal && !showNewGoalForm) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar
          isAuthenticated={!!user}
          authControl={<SteamLoginButton />}
        />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-20 pt-16 lg:px-10">
          <header className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <TargetSkinCard
              badge="Goal saved"
              name={savedGoal.skinName}
              subtitle={savedGoal.skinWeapon ?? savedGoal.skinType ?? ''}
              imageUrl={savedGoal.skinImageUrl ?? savedGoal.skinAltImageUrl ?? undefined}
              rarity={savedGoal.skinRarity ?? undefined}
              type={savedGoal.skinType ?? undefined}
              tags={[savedGoal.skinWeapon ?? undefined].filter(Boolean)}
              priceLabel="Target price"
              priceValue={formatCurrency(savedGoal.targetPrice)}
              meta={`Created ${new Date(savedGoal.createdAt).toLocaleString()}`}
              trailingContent={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    onClick={() => setShowNewGoalForm(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-500/40 px-4 py-2 text-sm font-medium text-purple-100 transition-colors hover:border-purple-400/60 hover:bg-purple-500/10"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Plan another goal
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800/70"
                  >
                    Back to dashboard
                  </Link>
                </div>
              }
            />
          </header>

          <section className="space-y-6 rounded-3xl border border-gray-800/60 bg-gray-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
            <h2 className="type-heading-lg text-white">Goal summary</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <StatCard label="Target price" value={formatCurrency(savedGoal.targetPrice)} />
              <StatCard label="Balance & planned sales" value={formatCurrency(savedGoal.coverageTotal)} />
              <StatCard label="From planned sales" value={formatCurrency(savedGoal.selectedTotal)} />
              <StatCard label="Existing balance" value={formatCurrency(savedGoal.balance)} />
              {savedGoal.remainingAmount > 0 ? (
                <StatCard
                  label="Still needed"
                  value={formatCurrency(savedGoal.remainingAmount)}
                  valueClassName="text-amber-300"
                />
              ) : (
                <StatCard
                  label="Surplus after purchase"
                  value={formatCurrency(savedGoal.surplusAmount)}
                  valueClassName="text-emerald-300"
                />
              )}
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-6">
              {savedGoal.selectedItems.length === 0 ? (
                <p className="text-sm text-gray-400">You didn't assign any inventory items to sell for this goal.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="type-heading-sm text-white">Items you plan to sell</h3>
                    <p className="type-body-xs text-gray-500">
                      Total estimated sale value: {formatCurrency(savedGoal.selectedTotal)}
                    </p>
                  </div>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {savedGoal.selectedItems.map((item) => (
                      <li key={item.id}>
                        <InventoryListCard
                          title={item.skinName}
                          subtitle={item.weapon ?? item.type ?? 'Skin'}
                          imageUrl={item.imageUrl}
                          footerLeft={`Tradable: ${item.tradeProtected ? 'No' : 'Yes'}`}
                          footerRight={formatCurrency(item.price)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

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
        priceOverrides={priceOverrides}
        onOverrideChange={handleOverrideChange}
        onClearAllOverrides={handleClearAllOverrides}
        getEffectivePrice={getEffectivePrice}
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


