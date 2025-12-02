'use client';

import { useState, useEffect } from 'react';
import type { CSSticker } from '@/lib/mockData';
import type { NewSkinData } from './types';
import StickerNameInput from './StickerNameInput';

type StickersSectionProps = {
  formData: NewSkinData;
  onChange: (updates: Partial<NewSkinData>) => void;
};

export default function StickersSection({ formData, onChange }: StickersSectionProps) {
  const stickers = formData.stickers || [];
  
  // Debug logging
  useEffect(() => {
    console.log('[StickersSection] Current stickers:', stickers);
  }, [stickers]);

  const addSticker = () => {
    if (stickers.length >= 5) {
      return; // Maximum 5 stickers
    }
    const newSticker: CSSticker = {
      name: '',
      price: undefined,
      slot: stickers.length + 1,
      imageUrl: undefined,
    };
    onChange({
      stickers: [...stickers, newSticker],
    });
  };

  const updateSticker = (index: number, updates: Partial<CSSticker>) => {
    const updated = stickers.map((sticker, i) =>
      i === index ? { ...sticker, ...updates } : sticker
    );
    console.log('[StickersSection] Updating sticker', index, ':', updates, 'new array:', updated);
    onChange({ stickers: updated });
  };

  const removeSticker = (index: number) => {
    const updated = stickers.filter((_, i) => i !== index);
    onChange({ stickers: updated.length > 0 ? updated : undefined });
  };

  return (
    <div className="animate-fadeIn space-y-4 border-t border-gray-700 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-400">Stickers</h3>
        <button
          type="button"
          onClick={addSticker}
          disabled={stickers.length >= 5}
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Sticker {stickers.length > 0 && `(${stickers.length}/5)`}
        </button>
      </div>

      {stickers.length === 0 && (
        <p className="text-sm text-gray-500">No stickers added. Click "Add Sticker" to add one.</p>
      )}
      
      {stickers.length > 0 && (
        <div className="text-xs text-gray-400 mb-2">
          {stickers.length} sticker{stickers.length !== 1 ? 's' : ''} configured
        </div>
      )}

      <div className="space-y-3">
        {stickers.map((sticker, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-700 bg-gray-800/60 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Sticker {index + 1}</span>
              <button
                type="button"
                onClick={() => removeSticker(index)}
                className="text-red-400 hover:text-red-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="relative">
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Sticker Name *
                </label>
                <StickerNameInput
                  value={sticker.name}
                  onChange={(name, imageUrl, price) => {
                    updateSticker(index, {
                      name,
                      imageUrl: imageUrl || sticker.imageUrl,
                      price: price ?? sticker.price,
                    });
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Sticker Price (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sticker.price ?? ''}
                  onChange={(e) =>
                    updateSticker(index, {
                      price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="0.00"
                />
                {sticker.price !== undefined && sticker.price !== null && (
                  <p className="mt-1 text-xs text-gray-500">Price: ${sticker.price.toFixed(2)}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Slot</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={sticker.slot ?? index + 1}
                  onChange={(e) =>
                    updateSticker(index, {
                      slot: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="1-5"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Image URL</label>
                <input
                  type="url"
                  value={sticker.imageUrl ?? ''}
                  onChange={(e) =>
                    updateSticker(index, { imageUrl: e.target.value || undefined })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="https://example.com/sticker.png"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

