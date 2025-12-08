'use client';

import { useState, useEffect, useMemo } from 'react';
import { InventoryItemDto, UpdateInventoryItemDto } from '@/lib/api';
import { CSItem, shouldShowFloat } from '@/lib/mockData';

type BulkPriceEditorModalProps = {
  items: CSItem[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Array<{ id: number; data: UpdateInventoryItemDto }>) => Promise<void>;
};

type ItemUpdate = {
  id: string;
  price: number;
  cost: number | null;
  float: number;
};

export default function BulkPriceEditorModal({
  items,
  isOpen,
  onClose,
  onSave,
}: BulkPriceEditorModalProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemUpdates, setItemUpdates] = useState<Map<string, ItemUpdate>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Initialize updates from all items and auto-select items with price=0 or cost=0
  useEffect(() => {
    if (isOpen && items.length > 0) {
      const updates = new Map<string, ItemUpdate>();
      const autoSelectedIds = new Set<string>();
      
      items.forEach((item) => {
        updates.set(item.id, {
          id: item.id,
          price: item.price ?? 0,
          cost: item.cost ?? null,
          float: item.float ?? 0.5,
        });
        
        const hasNoPrice = !item.price || item.price === 0;
        const hasNoCost = item.cost == null || item.cost === 0;
        const exceedsSteamLimit = item.priceExceedsSteamLimit ?? false;
        
        if (hasNoPrice || hasNoCost || exceedsSteamLimit) {
          autoSelectedIds.add(item.id);
        }
      });
      
      setItemUpdates(updates);
      setSelectedItemIds(autoSelectedIds);
      setError(null);
      setShowSelectedOnly(false);
      return;
    }

    if (!isOpen) {
      setItemUpdates(new Map());
      setSelectedItemIds(new Set());
      setShowSelectedOnly(false);
      setError(null);
    }
  }, [isOpen, items]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItemIds(new Set(items.map((item) => item.id)));
  };

  const deselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleUpdate = (id: string, field: 'price' | 'cost' | 'float', value: string) => {
    setItemUpdates((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(id) || { id, price: 0, cost: null, float: 0.5 };
      
      if (field === 'price' || field === 'float') {
        const numValue = parseFloat(value) || 0;
        newMap.set(id, { ...current, [field]: numValue });
      } else if (field === 'cost') {
        const numValue = value === '' ? null : parseFloat(value) || 0;
        newMap.set(id, { ...current, cost: numValue });
      }
      
      return newMap;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Only save selected items (or all if none selected)
      const itemsToSave = selectedItemIds.size > 0 
        ? Array.from(selectedItemIds)
        : items.map((item) => item.id);

      const updates = itemsToSave.map((itemId) => {
        const update = itemUpdates.get(itemId);
        const item = items.find((i) => i.id === itemId);
        if (!update || !item) return null;

        return {
          id: parseInt(itemId, 10),
          data: {
            price: update.price,
            cost: update.cost,
            float: update.float,
            paintSeed: item.paintSeed ?? undefined,
            imageUrl: item.imageUrl ?? undefined,
            tradeProtected: item.tradeProtected ?? false,
            stickers: [],
          } as UpdateInventoryItemDto,
        };
      }).filter((update): update is { id: number; data: UpdateInventoryItemDto } => update !== null);

      if (updates.length === 0) {
        setError('No items selected to update');
        return;
      }

      await onSave(updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save updates');
      console.error('Error saving bulk updates:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const displayedItems = useMemo(() => {
    if (showSelectedOnly && selectedItemIds.size > 0) {
      return items.filter((item) => selectedItemIds.has(item.id));
    }
    return items;
  }, [items, selectedItemIds, showSelectedOnly]);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedItemIds.has(item.id));
  }, [items, selectedItemIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Update Item Prices
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {selectedItemIds.size > 0 
                ? `${selectedItemIds.size} of ${items.length} items selected`
                : `${items.length} items - Select items to update`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSaving}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Deselect All
            </button>
            {selectedItemIds.size > 0 && (
              <button
                onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                {showSelectedOnly ? 'Show All' : `Show Selected (${selectedItemIds.size})`}
              </button>
            )}
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <p>Click items to select them for editing.</p>
            <p className="text-xs text-amber-200">
              Items flagged with the $2000 cap badge exceeded Steam’s wallet limit and need manual pricing.
            </p>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {selectedItemIds.size > 0 && (
            <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                Editing {selectedItemIds.size} Selected Item{selectedItemIds.size !== 1 ? 's' : ''}
              </h3>
              <div className="space-y-4">
                {selectedItems.map((item) => {
                  const update = itemUpdates.get(item.id);
                  if (!update) return null;

                  return (
                    <div
                      key={item.id}
                      className="flex gap-6 p-4 bg-gray-800/50 rounded-xl border border-purple-500/30"
                    >
                      {/* Item Image and Info */}
                      <div className="flex-shrink-0 w-48">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-32 object-contain rounded-lg mb-2 bg-gray-900"
                          />
                        )}
                        <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                          {item.exterior}
                        </div>
                        <div className="text-sm font-medium text-white line-clamp-2">
                          {item.name}
                        </div>
                      </div>

                      {/* Input Fields */}
                      <div className={`flex-1 grid gap-4 ${shouldShowFloat(item.type) ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {/* Price */}
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1.5">
                            Price (USD) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={update.price || ''}
                            onChange={(e) => handleUpdate(item.id, 'price', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Cost */}
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1.5">
                            Cost (USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={update.cost ?? ''}
                            onChange={(e) => handleUpdate(item.id, 'cost', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Float - only show for items that should have float */}
                        {shouldShowFloat(item.type) && (
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1.5">
                              Float Value (0.0 - 1.0)
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="1"
                              inputMode="decimal"
                              value={update.float || ''}
                              onChange={(e) => handleUpdate(item.id, 'float', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="e.g., 0.564978"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Item Grid - All Items with Photos */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {showSelectedOnly ? 'Selected Items' : 'All Items - Click to Select'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedItems.map((item) => {
                const isSelected = selectedItemIds.has(item.id);
                const update = itemUpdates.get(item.id);
                
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemSelection(item.id)}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 right-2 z-10">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-purple-500 border-purple-500'
                          : 'bg-gray-800/80 border-gray-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Item Image */}
                    {item.imageUrl && (
                      <div className="aspect-square bg-gray-900 rounded-t-lg overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    {/* Item Info */}
                    <div className="p-3">
                      <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                        {item.exterior}
                      </div>
                      <div className="text-sm font-medium text-white line-clamp-2 mb-2">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>Price: ${update?.price?.toFixed(2) || '0.00'}</span>
                        {item.priceExceedsSteamLimit && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                            $2000 cap
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {selectedItemIds.size > 0 
              ? `${selectedItemIds.size} item${selectedItemIds.size !== 1 ? 's' : ''} selected for update`
              : 'Select items from the grid above to edit their prices'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || selectedItemIds.size === 0}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </>
              ) : (
                `Save ${selectedItemIds.size} Item${selectedItemIds.size !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
