'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useInventory } from '@/hooks/useInventory';
import { formatCurrency } from '@/lib/utils';
import { inventoryItemsToCSItems } from '@/lib/dataConverter';
import GlobalSearchBar from '@/app/components/GlobalSearchBar';
import { saveGoal, GoalData } from '@/lib/goalStorage';
import type { InventoryItemDto, SkinDto } from '@/lib/api';

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

  const handleToggleItem = (item: InventoryItemDto) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(item.id)) {
        return prev.filter((id) => id !== item.id);
      }
      return [...prev, item.id];
    });
  };

  const handleSkinSelection = (skin: SkinDto) => {
    setSelectedSkin(skin);
    setTargetSkinName(skin.name);

    if (skin.defaultPrice && skin.defaultPrice > 0) {
      setTargetSkinPrice(skin.defaultPrice.toFixed(2));
    }
  };

  const handleClearSelectedSkin = () => {
    setSelectedSkin(null);
  };

  const handleAddGoal = () => {
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

    const goalData: GoalData = {
      id,
      createdAt: new Date().toISOString(),
      userId: user?.id,
      skinName: targetSkinName.trim(),
      skinId: selectedSkin?.id,
      targetPrice: parsedTargetPrice,
      balance: parsedBalance,
      selectedTotal,
      coverageTotal,
      remainingAmount,
      surplusAmount,
      selectedItems: selectedItems.map((item) => ({
        id: item.id,
        skinName: item.skinName,
        price: item.price ?? 0,
        tradeProtected: item.tradeProtected,
        imageUrl: item.imageUrl,
        weapon: item.weapon,
        type: item.type,
      })),
    };

    saveGoal(goalData);
    router.push(`/goal/summary?goalId=${id}`);
  };

  const renderStepHeading = (step: number, title: string, description?: string) => (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold text-white">Step {step}: {title}</h2>
      {description && <p className="text-sm text-gray-400">{description}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-20 pt-16 lg:px-10">
        <header className="flex flex-col gap-6 rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-purple-300/80">Goal Planner</p>
              <h1 className="text-3xl font-bold text-white">Set a Goal for Your Next Skin</h1>
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

          <p className="text-sm text-gray-400 leading-relaxed">
            This planner helps you figure out how close you are to affording a new skin.
            Add your target skin, choose items you plan to sell, and include any balance you already have on trading sites.
            We’ll crunch the numbers and show what you still need (or how much surplus you have).
          </p>
        </header>

        <section className="space-y-6 rounded-3xl border border-gray-800/60 bg-gray-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          {renderStepHeading(1, 'Pick the skin you’re aiming for', 'Search the full catalog and we’ll fill in the details for you.')}

          <div className="space-y-4">
            <GlobalSearchBar
              userInventory={inventoryAsCsItems}
              onAddSkin={handleSkinSelection}
              isLoggedIn
              actionLabel="Select"
              allowDuplicateSelection
            />

            {selectedSkin && (
              <div className="flex flex-col gap-3 rounded-2xl border border-purple-500/40 bg-purple-500/10 px-4 py-4 text-sm text-purple-100 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-purple-200/80">Selected skin</p>
                  <p className="mt-1 text-base font-semibold text-white">{selectedSkin.name}</p>
                  {selectedSkin.defaultPrice && selectedSkin.defaultPrice > 0 && (
                    <p className="text-xs text-purple-200/80">
                      Catalog price: {formatCurrency(selectedSkin.defaultPrice)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedSkin}
                  className="inline-flex items-center justify-center rounded-lg border border-purple-400/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-purple-100 transition-colors hover:border-purple-300/70 hover:bg-purple-500/20"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-gray-300">Skin name</span>
                <input
                  type="text"
                  value={targetSkinName}
                  onChange={(event) => setTargetSkinName(event.target.value)}
                  placeholder="e.g. M9 Bayonet | Doppler Phase 2"
                  className="rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-gray-300">Target price (USD)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetSkinPrice}
                  onChange={(event) => setTargetSkinPrice(event.target.value)}
                  placeholder="0.00"
                  className="rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </label>
            </div>

            <p className="text-xs text-gray-500">
              You can fine-tune the name or price manually even after selecting a skin from search.
            </p>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-gray-800/60 bg-gray-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          {renderStepHeading(2, 'Optionally pick inventory you plan to sell', 'Select items you’re willing to sell to help fund the purchase.')}

          {user && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-widest text-gray-500">Your inventory</span>
                  <span className="text-xs rounded-full border border-gray-800 bg-gray-950/80 px-2 py-0.5 text-gray-300">
                    {inventoryLoading ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'}`}
                  </span>
                </div>
                <input
                  type="search"
                  value={inventorySearch}
                  onChange={(event) => setInventorySearch(event.target.value)}
                  placeholder="Filter inventory…"
                  className="w-full max-w-xs rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  Failed to load inventory: {error}
                </div>
              )}

              {!inventoryLoading && filteredInventory.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/50 px-6 py-12 text-center text-sm text-gray-400">
                  {items.length === 0
                    ? 'We could not find any items in your inventory yet. Add some skins on the dashboard to plan with them here.'
                    : 'No inventory items match that search. Try another name or clear the filter.'}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                {filteredInventory.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleItem(item)}
                      className={`grid grid-cols-[auto,1fr,auto] grid-rows-[auto,auto] gap-x-4 gap-y-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-400/60 bg-emerald-500/15 shadow-lg shadow-emerald-500/10'
                          : 'border-gray-800 bg-gray-950/50 hover:border-gray-700 hover:bg-gray-900/60'
                      }`}
                    >
                      <div className="row-span-2 flex shrink-0 items-center">
                        <div
                          className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-gray-900/60 p-1.5 ${
                            isSelected ? 'border-emerald-400/70' : 'border-gray-800'
                          }`}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={`${item.skinName} preview`}
                              className="max-h-full max-w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-widest text-gray-500">
                              No image
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{item.skinName}</p>
                        <p className="truncate text-xs text-gray-400">{item.weapon ?? item.type}</p>
                      </div>
                      <div className="flex items-start justify-end gap-2 text-xs text-gray-300">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-emerald-200">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                            Selected
                          </span>
                        ) : (
                          <span className="whitespace-nowrap rounded-full border border-gray-800 px-2 py-1">Tap to add</span>
                        )}
                      </div>
                      <div className="col-start-2 col-span-2 flex items-center justify-between text-xs text-gray-400">
                        <span>Tradable: {item.tradeProtected ? 'No' : 'Yes'}</span>
                        <span className="font-semibold text-gray-200">
                          {formatCurrency(item.price ?? 0)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedItemIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  <div>
                    <p className="font-medium">Selected {selectedItemIds.length} item{selectedItemIds.length === 1 ? '' : 's'}</p>
                    <p className="text-xs text-emerald-200/80">Estimated sale value: {formatCurrency(selectedTotal)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItemIds([])}
                    className="rounded-lg border border-emerald-400/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-100 hover:bg-emerald-500/20"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>
          )}

          {!user && (
            <div className="rounded-xl border border-dashed border-purple-500/40 bg-purple-500/10 px-6 py-8 text-center text-sm text-purple-100">
              <p className="font-semibold text-purple-200">Log in with Steam to pick items from your inventory.</p>
              <p className="mt-2 text-xs text-purple-100/80">You can still plan manually by filling out the other steps.</p>
            </div>
          )}
        </section>

        <section className="space-y-6 rounded-3xl border border-gray-800/60 bg-gray-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          {renderStepHeading(3, 'Add any balance you already have', 'Include wallet balances or cash you can use right away.')}
          <div className="max-w-sm">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-300">Existing balance (USD)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={existingBalance}
                onChange={(event) => setExistingBalance(event.target.value)}
                placeholder="0.00"
                className="rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </label>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-purple-500/30 bg-purple-950/30 p-6 shadow-2xl shadow-purple-950/30 backdrop-blur">
          {renderStepHeading(4, 'Your affordability dashboard', 'See how close you are and what’s still missing.')}

          <div className="grid gap-4 md:grid-cols-2">
            <SummaryCard
              label="Target skin"
              value={targetSkinName ? targetSkinName : 'Not set yet'}
              secondaryValue={parsedTargetPrice > 0 ? formatCurrency(parsedTargetPrice) : '–'}
            />
            <SummaryCard
              label="From planned sales"
              value={formatCurrency(selectedTotal)}
              secondaryValue={`${selectedItemIds.length} item${selectedItemIds.length === 1 ? '' : 's'} selected`}
            />
            <SummaryCard
              label="Existing balance"
              value={formatCurrency(parsedBalance)}
              secondaryValue="Cash or site balance you already have"
            />
            <SummaryCard
              label="Total coverage"
              value={formatCurrency(coverageTotal)}
              secondaryValue="Planned sales + balance"
            />
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-6">
            {parsedTargetPrice <= 0 ? (
              <p className="text-sm text-gray-400">Enter a target price above to see how close you are.</p>
            ) : remainingAmount > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-lg font-semibold text-amber-300">You still need {formatCurrency(remainingAmount)}.</p>
                <p className="text-sm text-gray-300">
                  Based on your planned sales and balance, you have covered {formatCurrency(coverageTotal)} out of {formatCurrency(parsedTargetPrice)}.
                  Consider adding more items to sell or saving the remaining amount.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-lg font-semibold text-emerald-300">You can afford it!</p>
                <p className="text-sm text-emerald-100">
                  Your plan covers {formatCurrency(coverageTotal)}, which is enough for the target skin.{' '}
                  {surplusAmount > 0 && (
                    <span>You’ll have {formatCurrency(surplusAmount)} left after the purchase.</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {formError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {formError}
            </div>
          )}

          <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
            <div className="text-xs text-gray-500">
              We’ll store your goal locally on this device so you can revisit it later.
            </div>
            <button
              type="button"
              onClick={handleAddGoal}
              disabled={isSavingGoal || !targetSkinName.trim() || parsedTargetPrice <= 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-500/60"
            >
              {isSavingGoal ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2.5A9.5 9.5 0 003.5 12H4zm2 5.291A7.962 7.962 0 014 12H2.5c0 3.31 1.344 6.31 3.52 8.477L6 17.291z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Goal
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  secondaryValue?: string;
};

function SummaryCard({ label, value, secondaryValue }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/70 px-5 py-4 shadow-lg shadow-black/30">
      <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {secondaryValue && <p className="mt-1 text-xs text-gray-400">{secondaryValue}</p>}
    </div>
  );
}


