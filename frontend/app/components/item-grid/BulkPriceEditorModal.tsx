'use client';

import { useState, useEffect } from 'react';
import { InventoryItemDto, UpdateInventoryItemDto } from '@/lib/api';
import { CSItem } from '@/lib/mockData';

type BulkPriceEditorModalProps = {
  items: CSItem[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Array<{ id: number; data: UpdateInventoryItemDto }>) => Promise<void>;
};

// Note: CSItem uses string IDs, but we convert to number for API calls

type ItemUpdate = {
  id: string; // CSItem uses string IDs
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
  const [itemUpdates, setItemUpdates] = useState<Map<string, ItemUpdate>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize updates from items
  useEffect(() => {
    if (isOpen && items.length > 0) {
      const updates = new Map<string, ItemUpdate>();
      items.forEach((item) => {
        updates.set(item.id, {
          id: item.id,
          price: item.price ?? 0,
          cost: item.cost ?? null,
          float: item.float ?? 0.5,
        });
      });
      setItemUpdates(updates);
      setError(null);
    }
  }, [isOpen, items]);

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

      const updates = Array.from(itemUpdates.values()).map((update) => {
        const item = items.find((i) => i.id === update.id);
        return {
          id: parseInt(update.id, 10), // Convert string ID to number for API
          data: {
            price: update.price,
            cost: update.cost,
            float: update.float,
            paintSeed: item?.paintSeed ?? undefined,
            imageUrl: item?.imageUrl ?? undefined,
            tradeProtected: item?.tradeProtected ?? false,
            stickers: [],
          } as UpdateInventoryItemDto,
        };
      });

      await onSave(updates);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save updates');
      console.error('Error saving bulk updates:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            Add Price to Items ({items.length} items)
          </h2>
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

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {items.map((item) => {
              const update = itemUpdates.get(item.id);
              if (!update) return null;

              return (
                <div
                  key={item.id}
                  className="flex gap-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700"
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
                  <div className="flex-1 grid grid-cols-3 gap-4">
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
                      <p className="mt-1 text-xs text-gray-500">
                        The amount you paid for this item (used for profit calculation)
                      </p>
                    </div>

                    {/* Float */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Float Value (0.0 - 1.0)
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        min="0"
                        max="1"
                        value={update.float || ''}
                        onChange={(e) => handleUpdate(item.id, 'float', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 0.564978"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Leave empty if unknown. Float determines wear condition.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
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
              `Save All (${items.length} items)`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

