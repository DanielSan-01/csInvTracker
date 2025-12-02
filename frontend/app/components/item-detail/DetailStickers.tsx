'use client';

import { useState, useRef, useEffect } from 'react';
import type { CSItem, CSSticker } from '@/lib/mockData';
import StickerTooltip from './StickerTooltip';

type DetailStickersProps = {
  item: CSItem;
};

export default function DetailStickers({ item }: DetailStickersProps) {
  const stickers = item.stickers || [];
  const [activeTooltip, setActiveTooltip] = useState<{
    sticker: CSSticker;
    position: { x: number; y: number };
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveTooltip(null);
      }
    };

    if (activeTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeTooltip]);

  if (stickers.length === 0) {
    return null;
  }

  const handleStickerClick = (sticker: CSSticker, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top,
    };

    if (activeTooltip?.sticker.id === sticker.id) {
      setActiveTooltip(null);
    } else {
      setActiveTooltip({ sticker, position });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        {stickers.map((sticker, index) => (
          <button
            key={sticker.id ?? index}
            onClick={(e) => handleStickerClick(sticker, e)}
            onMouseEnter={(e) => {
              if (!activeTooltip) {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveTooltip({
                  sticker,
                  position: {
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  },
                });
              }
            }}
            className="group relative h-12 w-12 rounded border border-gray-700/50 bg-gray-800/40 p-1.5 transition-all hover:border-gray-600 hover:bg-gray-800/80 hover:shadow-lg"
            aria-label={`Sticker: ${sticker.name}`}
          >
            {sticker.imageUrl ? (
              <img
                src={sticker.imageUrl}
                alt={sticker.name}
                className="h-full w-full object-contain"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('svg')) {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('class', 'h-full w-full text-gray-400');
                    svg.setAttribute('fill', 'currentColor');
                    svg.setAttribute('viewBox', '0 0 20 20');
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute(
                      'd',
                      'M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z'
                    );
                    svg.appendChild(path);
                    parent.appendChild(svg);
                  }
                }}
              />
            ) : (
              <svg className="h-full w-full text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded opacity-0 transition-opacity group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(147,51,234,0.5)]" />
          </button>
        ))}
      </div>

      {activeTooltip && (
        <StickerTooltip
          sticker={activeTooltip.sticker}
          position={activeTooltip.position}
          onClose={() => setActiveTooltip(null)}
        />
      )}
    </div>
  );
}

