'use client';

import { useState, useEffect, useMemo } from 'react';
import type { CSItem } from '@/lib/mockData';
import { shouldShowFloat } from '@/lib/mockData';

type BulkFloatRefreshModalProps = {
  items: CSItem[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => Promise<void>;
};

export default function BulkFloatRefreshModal({
  items,
  isOpen,
  onClose,
  onConfirm,
}: BulkFloatRefreshModalProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Initialize selection: auto-select items that should show float but are still at the default/sentinel 0.5
  useEffect(() => {
    if (isOpen && items.length > 0) {
      const autoSelectedIds = new Set<string>();

      items.forEach((item) => {
        if (shouldShowFloat(item.type) && Math.abs(item.float - 0.5) < 0.000001) {
          autoSelectedIds.add(item.id);
        }
      });

      setSelectedItemIds(autoSelectedIds.size > 0 ? autoSelectedIds : new Set(items.map(i => i.id)));
      setError(null);
      setShowSelectedOnly(false);
      return;
    }

    if (!isOpen) {
      setSelectedItemIds(new Set());
      setError(null);
      setShowSelectedOnly(false);
    }
  }, [isOpen, items]);

  if (!isOpen) {
    return null;
  }

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItemIds(new Set(items.map((item) => item.id)));
  };

  const deselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const ids = selectedItemIds.size > 0 ? Array.from(selectedItemIds) : items.map((i) => i.id);
      if (ids.length === 0) {
        setError('No items selected to refresh floats for.');
        return;
      }

      await onConfirm(ids);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue float refresh.');
      console.error('Error confirming bulk float refresh:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedItems = useMemo(() => {
    if (showSelectedOnly && selectedItemIds.size > 0) {
      return items.filter((item) => selectedItemIds.has(item.id));
    }
    return items;
  }, [items, selectedItemIds, showSelectedOnly]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 p-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Refresh Floats</h2>
            <p className="mt-1 text-sm text-gray-400">
              Select the items you want to refresh float and exterior data for. Items without a known float are
              auto-selected.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-white"
            disabled={isSubmitting}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-600"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-600"
            >
              Deselect All
            </button>
            {selectedItemIds.size > 0 && (
              <button
                onClick={() => setShowSelectedOnly((prev) => !prev)}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-sky-700"
              >
                {showSelectedOnly ? 'Show All' : `Show Selected (${selectedItemIds.size})`}
              </button>
            )}
          </div>
          <div className="text-sm text-gray-400">
            {selectedItemIds.size > 0
              ? `${selectedItemIds.size} of ${items.length} items selected`
              : `${items.length} items - Select the ones to refresh`}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-900/30 p-4 text-red-200">
              {error}
            </div>
          )}

          {displayedItems.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              No items available for float refresh.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {displayedItems.map((item) => {
                const isSelected = selectedItemIds.has(item.id);
                const needsFloat = shouldShowFloat(item.type) && Math.abs(item.float - 0.5) < 0.000001;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItemSelection(item.id)}
                    className={`flex flex-col overflow-hidden rounded-xl border p-2 text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20'
                        : 'border-gray-700 bg-gray-900/60 hover:border-sky-400/60 hover:bg-gray-800/70'
                    }`}
                  >
                    <div className="relative mb-2 h-24 w-full overflow-hidden rounded-lg bg-gray-900">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                          No image
                        </div>
                      )}
                      {needsFloat && (
                        <span className="absolute bottom-1 left-1 rounded bg-sky-600/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Add float
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="line-clamp-2 text-xs font-semibold text-white">{item.name}</div>
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">{item.type}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-700 p-4">
          <p className="text-xs text-gray-400">
            Floats are fetched live from Steam/float services. This may take some time for large selections.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || items.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Queuing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 15a4 4 0 004 4h10a4 4 0 004-4M7 15V9a5 5 0 0110 0v6"
                    />
                  </svg>
                  Refresh Selected Floats
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


