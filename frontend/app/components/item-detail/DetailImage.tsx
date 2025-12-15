'use client';

import { useState, useRef, useEffect } from 'react';
import type { CSItem, CSSticker } from '@/lib/mockData';
import { exteriorAbbr, rarityGradients, formatPrice } from '@/lib/mockData';
import type { ItemCardAnimation } from '../ItemCardShared';
import StickerTooltip from './StickerTooltip';

type DetailImageProps = {
  item: CSItem;
  animation: ItemCardAnimation;
};

export default function DetailImage({ item, animation }: DetailImageProps) {
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

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!item.tradeProtected || !item.tradableAfter) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [item.tradeProtected, item.tradableAfter]);

  const tradableAt = item.tradableAfter ? new Date(item.tradableAfter).getTime() : null;
  const isTradeLocked = !!(item.tradeProtected && tradableAt && tradableAt > now);
  const remainingMs = isTradeLocked && tradableAt ? tradableAt - now : 0;

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return 'now';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (days === 0 && minutes > 0) parts.push(`${minutes}m`);
    if (parts.length === 0) return 'under 1m';
    return parts.slice(0, 2).join(' ');
  };

  const remainingLabel = isTradeLocked ? formatRemaining(remainingMs) : null;

  return (
    <div
      ref={animation.imageContainerRef}
      className={`relative flex flex-col bg-gradient-to-b ${rarityGradients[item.rarity]}`}
      style={{
        opacity: animation.imageLoaded ? 1 : 0.3,
        filter: animation.imageLoaded ? 'brightness(1)' : 'brightness(0.5)',
      }}
    >
      <div className="flex flex-1 items-center justify-center px-6 pt-10">
        <div
          ref={animation.imageRef}
          className="flex h-full w-full items-center justify-center"
        >
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
          )}
        </div>
      </div>

      {/* Stickers display below weapon image */}
      {stickers.length > 0 && (
        <div ref={containerRef} className="relative flex items-center justify-center gap-2 px-6 pb-4">
          {stickers.slice(0, 5).map((sticker, idx) => (
            <button
              key={sticker.id ?? idx}
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
              <div className="absolute inset-0 rounded opacity-0 transition-opacity group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(147,51,234,0.5)]" />
            </button>
          ))}

          {activeTooltip && (
            <StickerTooltip
              sticker={activeTooltip.sticker}
              position={activeTooltip.position}
              onClose={() => setActiveTooltip(null)}
            />
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950/70 via-gray-950/0 to-gray-950/40" />

      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-white/30 bg-black/40 px-3 py-1 text-xs font-semibold text-white">
          {exteriorAbbr[item.exterior]}
        </span>
        {isTradeLocked ? (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3a.75.75 0 01.75.75v3.17l2.03 2.03a.75.75 0 11-1.06 1.06l-2.25-2.25A.75.75 0 019.25 9V5.75A.75.75 0 0110 5z"
                clipRule="evenodd"
              />
            </svg>
            Trade locked{remainingLabel ? ` • ${remainingLabel}` : ''}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-7.5 9a.75.75 0 01-1.079.082l-3.5-3.25a.75.75 0 011.02-1.1l2.907 2.701 7.023-8.43a.75.75 0 011.052-.143z"
                clipRule="evenodd"
              />
            </svg>
            Trade ready
          </span>
        )}
      </div>
    </div>
  );
}

