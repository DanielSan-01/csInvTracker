'use client';

import { formatPrice } from '@/lib/mockData';
import type { CSSticker } from '@/lib/mockData';

type StickerTooltipProps = {
  sticker: CSSticker;
  position: { x: number; y: number };
  onClose: () => void;
};

export default function StickerTooltip({ sticker, position, onClose }: StickerTooltipProps) {
  return (
    <div
      className="fixed z-50 w-64 rounded-lg border border-gray-700 bg-gray-900/98 p-4 shadow-2xl backdrop-blur-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-12px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white">
              Sticker | {sticker.name}
            </h4>
            <p className="mt-1 text-xs text-gray-400">0% Wear</p>
            {sticker.slot !== undefined && sticker.slot !== null && (
              <p className="mt-1 text-xs text-gray-400">Slot {sticker.slot}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-2 flex-shrink-0 text-gray-500 transition-colors hover:text-white"
            aria-label="Close tooltip"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        {sticker.price !== undefined && sticker.price !== null && (
          <div className="border-t border-gray-700 pt-2">
            <p className="text-xs text-gray-400">
              Reference Price:{' '}
              <span className="font-semibold text-emerald-400">{formatPrice(sticker.price)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

