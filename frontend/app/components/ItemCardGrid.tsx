'use client';

import type { CSItem } from '@/lib/mockData';
import {
  exteriorAbbr,
  formatFloat,
  formatPrice,
  getFloatColor,
  rarityGradients,
  shouldShowFloat,
} from '@/lib/mockData';
import type { ItemCardAnimation } from './ItemCardShared';

type ItemCardGridProps = {
  item: CSItem;
  animation: ItemCardAnimation;
  onClick?: () => void;
  isSelected?: boolean;
  onQuickEdit?: (field: 'price' | 'cost' | 'float') => void;
};

export default function ItemCardGrid({
  item,
  animation,
  onClick,
  isSelected = false,
  onQuickEdit,
}: ItemCardGridProps) {
  const showFloat = shouldShowFloat(item.type);

  const floatBadgeLabel = (() => {
    if (!showFloat) {
      // For non-floatable items (agents, cases, stickers, etc.), show the item type label
      return item.type;
    }

    // Treat the default/sentinel 0.5 value as "no float yet" for display purposes
    if (Math.abs(item.float - 0.5) < 0.000001) {
      return 'Add float';
    }

    return formatFloat(item.float, 4);
  })();

  const hasRealFloat = showFloat && Math.abs(item.float - 0.5) >= 0.000001;

  return (
    <div
      ref={animation.cardRef}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 shadow-lg shadow-blue-500/20'
          : 'border-gray-800 hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/10'
      }`}
      onClick={onClick}
      onMouseEnter={animation.handleMouseEnter}
      onMouseLeave={animation.handleMouseLeave}
    >
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 via-black/60 to-transparent p-3">
        <h3 className="line-clamp-2 text-base font-bold leading-tight text-white drop-shadow-lg">
          {item.name}
        </h3>
      </div>

      <div
        ref={animation.imageContainerRef}
        className={`relative aspect-[4/3] min-h-[240px] w-full overflow-hidden bg-gradient-to-b ${rarityGradients[item.rarity]}`}
        style={{
          opacity: animation.imageLoaded ? 1 : 0.3,
          filter: animation.imageLoaded ? 'brightness(1)' : 'brightness(0.5)',
        }}
      >
        <div
          ref={animation.imageRef}
          className="h-full w-full bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: item.imageUrl ? `url("${item.imageUrl}")` : 'none' }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />

        {/* Float value or type label and trade protection badge */}
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
          <span
            className="rounded border border-white/20 bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              if (showFloat) {
                onQuickEdit?.('float');
              }
            }}
          >
            {floatBadgeLabel}
          </span>
          {item.tradeProtected && (
            <span className="inline-flex items-center gap-0.5 rounded border border-amber-500/40 bg-amber-500/30 px-1.5 py-0.5 text-[9px] text-amber-200">
              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a8 8 0 00-8 8v3a3 3 0 003 3h1v-3H5v-3a5 5 0 1110 0v3h-1v3h1a3 3 0 003-3v-3a8 8 0 00-8-8zm-1 11a1 1 0 112 0v1a1 1 0 11-2 0v-1z"
                  clipRule="evenodd"
                />
              </svg>
              Lock
            </span>
          )}
        </div>

        {/* Stickers overlaid on the image, positioned higher to overlay more and avoid float badge */}
        {item.stickers && item.stickers.length > 0 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5" style={{ maxWidth: 'calc(100% - 4rem)' }}>
            {item.stickers.slice(0, 5).map((sticker, idx) => (
              <div
                key={sticker.id ?? idx}
                className="h-10 w-10"
                title={sticker.name}
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
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-sm">
        {/* Price info in a more compact layout */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <div className="min-w-0">
            <span className="text-[8px] uppercase tracking-wide text-gray-500">Value</span>
            <div
              className="text-xs font-semibold text-emerald-400 leading-tight truncate"
              style={{ fontSize: 'clamp(0.625rem, 2.5vw, 0.75rem)' }}
              onClick={(e) => {
                e.stopPropagation();
                onQuickEdit?.('price');
              }}
            >
              {formatPrice(item.price)}
            </div>
          </div>
          {item.cost !== undefined && (
            <div className="min-w-0">
              <span className="text-[8px] uppercase tracking-wide text-gray-500">Cost</span>
              <div
                className="text-[10px] font-medium text-gray-200 leading-tight truncate"
                style={{ fontSize: 'clamp(0.5rem, 2vw, 0.625rem)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickEdit?.('cost');
                }}
              >
                {formatPrice(item.cost)}
              </div>
            </div>
          )}
        </div>

        {/* Profit and exterior badge */}
        {item.cost !== undefined && item.cost !== null && (() => {
          const cost = item.cost as number;
          const profitValue = item.price - cost;
          return (
            <div className="flex items-center justify-between gap-2">
              <div
                className={`min-w-0 flex-1 text-[10px] font-semibold leading-tight truncate ${
                  profitValue >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
                style={{ fontSize: 'clamp(0.5rem, 2vw, 0.625rem)' }}
              >
                Profit {profitValue >= 0 ? '+' : ''}
                {formatPrice(profitValue)}
              </div>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold ${getFloatColor(item.float)} text-white`}
              >
                {exteriorAbbr[item.exterior]}
              </span>
            </div>
          );
        })()}

        {/* Float bar - always render to keep card heights consistent */}
        <div className="flex items-center gap-1">
          <div
            className={`relative h-1.5 flex-1 overflow-hidden rounded-full ${
              showFloat ? 'bg-gradient-to-r from-green-500 via-yellow-500 to-red-500' : 'bg-gray-800'
            }`}
          >
            {hasRealFloat && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                style={{ left: `${Math.min(item.float * 100, 100)}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


