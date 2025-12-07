'use client';

import { useState, useMemo, useEffect } from 'react';
import InventoryListCard from '@/app/components/InventoryListCard';
import type { InventoryItemDto, User } from '@/lib/api';

import GoalStepSection from './GoalStepSection';

const ITEMS_PER_PAGE = 20;

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemCountLabel = items.length === 1 ? 'item' : 'items';
  const selectedCountLabel = selectedItemIds.length === 1 ? 'item' : 'items';

  // Sort items by price (most expensive to least expensive)
  const sortedFilteredItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }, [filteredItems]);

  // Pagination
  const totalPages = Math.ceil(sortedFilteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = sortedFilteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when items change or when expanding
  useEffect(() => {
    if (isExpanded) {
      setCurrentPage(1);
    }
  }, [isExpanded, sortedFilteredItems.length]);

  // Ensure current page is valid
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of inventory section when page changes
    const element = document.getElementById('goal-inventory-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <GoalStepSection
      step={step}
      title="Optionally pick inventory you plan to sell"
      description="Select items you're willing to sell to help fund the purchase."
    >
      {user ? (
        <div id="goal-inventory-section" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-gray-500">Your inventory</span>
              <span className="text-xs rounded-full border border-gray-800 bg-gray-950/80 px-2 py-0.5 text-gray-300">
                {inventoryLoading ? 'Loading…' : `${items.length} ${itemCountLabel}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={inventorySearch}
                onChange={(event) => onInventorySearchChange(event.target.value)}
                placeholder="Filter inventory…"
                className="w-full max-w-xs rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-center rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-white transition-colors hover:border-purple-500 hover:bg-purple-500/10"
                aria-label={isExpanded ? 'Collapse inventory' : 'Expand inventory'}
              >
                <svg
                  className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
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

          {isExpanded && (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {paginatedItems.map((item) => {
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                                page === currentPage
                                  ? 'bg-purple-600 text-white'
                                  : 'border border-gray-700 bg-gray-800 text-white hover:bg-gray-700'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-2 text-gray-400">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  
                  <div className="text-center text-sm text-gray-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, sortedFilteredItems.length)} of {sortedFilteredItems.length} items
                  </div>
                </div>
              )}
            </>
          )}

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



