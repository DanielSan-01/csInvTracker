'use client';

import InventoryListCard from '@/app/components/InventoryListCard';
import type { InventoryItemDto, User } from '@/lib/api';

import GoalStepSection from './GoalStepSection';

type GoalInventorySectionProps = {
  step: number;
  user: User | null | undefined;
  items: InventoryItemDto[];
  filteredItems: InventoryItemDto[];
  selectedItemIds: number[];
  onToggleItem: (item: InventoryItemDto) => void;
  onClearSelection: () => void;
  inventoryLoading: boolean;
  inventorySearch: string;
  onInventorySearchChange: (value: string) => void;
  selectedTotal: number;
  error?: string | null;
  formatCurrency: (value: number) => string;
};

const GoalInventorySection = ({
  step,
  user,
  items,
  filteredItems,
  selectedItemIds,
  onToggleItem,
  onClearSelection,
  inventoryLoading,
  inventorySearch,
  onInventorySearchChange,
  selectedTotal,
  error,
  formatCurrency,
}: GoalInventorySectionProps) => {
  const itemCountLabel = items.length === 1 ? 'item' : 'items';
  const selectedCountLabel = selectedItemIds.length === 1 ? 'item' : 'items';

  return (
    <GoalStepSection
      step={step}
      title="Optionally pick inventory you plan to sell"
      description="Select items you’re willing to sell to help fund the purchase."
    >
      {user ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-gray-500">Your inventory</span>
              <span className="text-xs rounded-full border border-gray-800 bg-gray-950/80 px-2 py-0.5 text-gray-300">
                {inventoryLoading ? 'Loading…' : `${items.length} ${itemCountLabel}`}
              </span>
            </div>
            <input
              type="search"
              value={inventorySearch}
              onChange={(event) => onInventorySearchChange(event.target.value)}
              placeholder="Filter inventory…"
              className="w-full max-w-xs rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              Failed to load inventory: {error}
            </div>
          )}

          {!inventoryLoading && filteredItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/50 px-6 py-12 text-center text-sm text-gray-400">
              {items.length === 0
                ? 'We could not find any items in your inventory yet. Add some skins on the dashboard to plan with them here.'
                : 'No inventory items match that search. Try another name or clear the filter.'}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {filteredItems.map((item) => {
              const isSelected = selectedItemIds.includes(item.id);
              return (
                <InventoryListCard
                  key={item.id}
                  title={item.skinName}
                  subtitle={item.weapon ?? item.type}
                  imageUrl={item.imageUrl}
                  selectable
                  isSelected={isSelected}
                  onClick={() => onToggleItem(item)}
                  footerLeft={`Tradable: ${item.tradeProtected ? 'No' : 'Yes'}`}
                  footerRight={formatCurrency(item.price ?? 0)}
                />
              );
            })}
          </div>

          {selectedItemIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <div>
                <p className="font-medium">
                  Selected {selectedItemIds.length} {selectedCountLabel}
                </p>
                <p className="text-xs text-emerald-200/80">
                  Estimated sale value: {formatCurrency(selectedTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClearSelection}
                className="rounded-lg border border-emerald-400/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-100 hover:bg-emerald-500/20"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-purple-500/40 bg-purple-500/10 px-6 py-8 text-center text-sm text-purple-100">
          <p className="font-semibold text-purple-200">Log in with Steam to pick items from your inventory.</p>
          <p className="mt-2 text-xs text-purple-100/80">
            You can still plan manually by filling out the other steps.
          </p>
        </div>
      )}
    </GoalStepSection>
  );
};

export default GoalInventorySection;


