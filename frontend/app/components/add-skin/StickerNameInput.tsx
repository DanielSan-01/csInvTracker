'use client';

import { useState, useEffect } from 'react';
import { useStickerCatalog } from '@/hooks/useStickerCatalog';
import { useSkinCatalog } from '@/hooks/useSkinCatalog';
import { formatPrice } from '@/lib/mockData';

type StickerNameInputProps = {
  value: string;
  onChange: (name: string, imageUrl?: string, price?: number) => void;
};

export default function StickerNameInput({ value, onChange }: StickerNameInputProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  
  
  // Search both stickers and skins (stickers might be stored as skins)
  const { stickers, loading: stickersLoading } = useStickerCatalog(searchTerm);
  const { skins, loading: skinsLoading } = useSkinCatalog(searchTerm);
  
  const loading = stickersLoading || skinsLoading;

  // Sync searchTerm with value prop when it changes externally
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Filter skins to only show sticker-related ones
  const stickerSkins = skins.filter(skin => 
    skin.name.toLowerCase().includes('sticker') || 
    skin.type?.toLowerCase() === 'sticker'
  );

  // Extract sticker name from skin name (e.g., "Sticker | Crown (Foil)" -> "Crown (Foil)")
  const extractStickerName = (skinName: string): string => {
    const match = skinName.match(/sticker\s*\|\s*(.+)/i);
    return match ? match[1].trim() : skinName.replace(/^sticker\s*/i, '').trim();
  };

  const handleSelect = (item: { name: string; imageUrl?: string; price?: number }) => {
    onChange(item.name, item.imageUrl, item.price);
    setSearchTerm(item.name);
    setShowDropdown(false);
  };

  const handleChange = (newValue: string) => {
    setSearchTerm(newValue);
    onChange(newValue);
    setShowDropdown(newValue.length >= 2);
  };

  // Combine results: stickers from sticker catalog + stickers from skin catalog
  const allResults = [
    ...stickers.map(s => ({
      name: s.name,
      imageUrl: s.imageUrl,
      price: s.averagePrice,
      source: 'sticker' as const,
    })),
    ...stickerSkins.map(s => ({
      name: extractStickerName(s.name),
      imageUrl: s.imageUrl,
      price: s.defaultPrice,
      source: 'skin' as const,
    })),
  ];

  // Remove duplicates by name (prefer sticker catalog results)
  const uniqueResults = Array.from(
    new Map(allResults.map(item => [item.name.toLowerCase(), item])).values()
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setShowDropdown(searchTerm.length >= 2)}
        onBlur={() => {
          // Delay to allow click on dropdown item
          setTimeout(() => setShowDropdown(false), 200);
        }}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        placeholder="e.g., Lotus (Glitter)"
        required
      />

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-purple-500/50 bg-gray-900 shadow-xl">
          {loading ? (
            <div className="p-4 text-center text-purple-300 text-sm">Searching...</div>
          ) : uniqueResults.length > 0 ? (
            <div className="py-1">
              {uniqueResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="group flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-purple-500/20"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-10 w-10 rounded border border-purple-500/40 bg-gray-950/60 object-contain"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded border border-purple-500/40 bg-purple-900/40 text-xs text-purple-200">
                      No Img
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-purple-100 group-hover:text-white">{item.name}</p>
                    {item.price && (
                      <p className="mt-1 text-xs text-gray-400">
                        {item.source === 'sticker' ? 'Avg: ' : 'Price: '}
                        {formatPrice(item.price)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm">
              No stickers found. Type to search or enter manually.
            </div>
          )}
        </div>
      )}
    </div>
  );
}









