'use client';

import type { CSItem } from '@/lib/mockData';
import {
  calculateProfit,
  calculateProfitPercentage,
  exteriorAbbr,
  formatFloat,
  formatPrice,
  getFloatColor,
  rarityGradients,
} from '@/lib/mockData';
import {
  ItemCardAnimation,
  exteriorDetails,
  formatProfitDisplay,
  infoPillBase,
} from './ItemCardShared';

type ItemCardDetailedProps = {
  item: CSItem;
  animation: ItemCardAnimation;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function ItemCardDetailed({
  item,
  animation,
  onEdit,
  onDelete,
}: ItemCardDetailedProps) {
  const profit =
    item.cost !== undefined ? calculateProfit(item.price, item.cost) : undefined;
  const profitPercent =
    item.cost !== undefined
      ? calculateProfitPercentage(item.price, item.cost)
      : undefined;
  const profitDisplay = formatProfitDisplay(profit, profitPercent);
  const exteriorInfo = exteriorDetails[item.exterior];

  return (
    <div
      ref={animation.cardRef}
      className="relative flex flex-col gap-6 transition-all"
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg"
        onMouseEnter={animation.handleMouseEnter}
        onMouseLeave={animation.handleMouseLeave}
      >
        <div
          ref={animation.imageContainerRef}
          className={`relative w-full aspect-[3/2] bg-gradient-to-b ${rarityGradients[item.rarity]} flex items-center justify-center`}
          style={{
            opacity: animation.imageLoaded ? 1 : 0.3,
            filter: animation.imageLoaded ? 'brightness(1)' : 'brightness(0.5)',
          }}
        >
          <div
            ref={animation.imageRef}
            className="flex h-full w-full items-center justify-center px-6 pt-10 pb-6"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950/60 via-gray-950/0 to-gray-950/40" />
        </div>

        <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full border border-white/30 bg-black/40 px-3 py-1 text-xs font-semibold text-white">
            {exteriorAbbr[item.exterior]}
          </span>
          {item.tradeProtected && item.tradableAfter ? (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3a.75.75 0 01.75.75v3.17l2.03 2.03a.75.75 0 11-1.06 1.06l-2.25-2.25A.75.75 0 019.25 9V5.75A.75.75 0 0110 5z"
                  clipRule="evenodd"
                />
              </svg>
              Trade locked
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

      <div className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900/70 p-5 shadow-inner shadow-black/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <h2 className="text-[22px] font-semibold leading-tight text-white">
            {item.name}
          </h2>

          <div className="flex flex-col items-end gap-1.5">
            <div className="text-[10px] uppercase tracking-[0.28em] text-gray-400">
              Market Value
            </div>
            <div className="text-[26px] font-semibold text-emerald-400">
              {formatPrice(item.price)}
            </div>
            {item.cost !== undefined && (
              <div className="text-xs text-gray-400">
                Cost basis:{' '}
                <span className="text-gray-200">{formatPrice(item.cost)}</span>
              </div>
            )}
            <div className={`text-xs font-medium ${profitDisplay.className}`}>
              {profitDisplay.label}: {profitDisplay.value}
            </div>
            {onEdit && (
              <button
                onClick={onEdit}
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-[10px] font-medium text-blue-200 transition-colors hover:bg-blue-500/20"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Item
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-200 transition-colors hover:bg-red-500/20"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m11 0H6"
                  />
                </svg>
                Delete Item
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-400">
            <span>Float value</span>
            <span className="font-mono text-sm text-white">
              {formatFloat(item.float, 6)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full ${getFloatColor(item.float)}`}
              style={{ width: `${Math.min(item.float, 1) * 100}%` }}
            />
          </div>
          <p className="text-xs leading-relaxed text-gray-400">
            {item.collection
              ? `Part of the ${item.collection}.`
              : item.weapon
              ? `Weapon: ${item.weapon}.`
              : 'Source collection unknown.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-300">
          <div className={infoPillBase}>
            <svg className="h-4 w-4 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 01.894.553l2.382 4.764 5.258.764a1 1 0 01.554 1.706l-3.807 3.71.899 5.239a1 1 0 01-1.451 1.054L10 16.347l-4.729 2.487A1 1 0 013.82 18.5l.899-5.24-3.808-3.707A1 1 0 011.465 8.08l5.258-.765L9.106 2.553A1 1 0 0110 2z" />
            </svg>
            {item.rarity}
          </div>
          <div className={infoPillBase}>
            <svg className="h-4 w-4 text-sky-300" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v2a4 4 0 002 3.465v1.535a2 2 0 002 2h1.055a3 3 0 002.83 2H13a2 2 0 002-2v-3a2 2 0 002-2V5a2 2 0 00-2-2H4zm5 9.917V9a1 1 0 112 0v6a1 1 0 01-1 1h-.945a3 3 0 01-1.055-.183z"
                clipRule="evenodd"
              />
            </svg>
            Exterior: {item.exterior}
          </div>
          <div className={infoPillBase}>
            <svg className="h-4 w-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 3a1 1 0 00-1 1v1H4a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1V4a1 1 0 10-2 0v1H7V4a1 1 0 00-1-1zm0 4h8v2H6V7zm0 4h3v2H6v-2zm5 0h3v2h-3v-2z"
                clipRule="evenodd"
              />
            </svg>
            Type: {item.type}
          </div>
          {item.paintSeed && (
            <div className={infoPillBase}>
              <svg className="h-4 w-4 text-pink-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 01.832.445l4.5 6.5a1 1 0 01.168.555V15a1 1 0 01-1 1h-10a1 1 0 01-1-1V9.5a1 1 0 01.168-.555l4.5-6.5A1 1 0 0110 2zm0 3.236L6.5 9.5V14h7v-4.5L10 5.236z" />
              </svg>
              Paint seed: {item.paintSeed}
            </div>
          )}
        </div>

        {item.tradeProtected && item.tradableAfter && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 00-8 8v3a3 3 0 003 3h1v-3H5v-3a5 5 0 1110 0v3h-1v3h1a3 3 0 003-3v-3a8 8 0 00-8-8zm-1 11a1 1 0 112 0v1a1 1 0 11-2 0v-1z"
                clipRule="evenodd"
              />
            </svg>
            Trade lock expires in {animation.timeRemaining}
          </div>
        )}
      </div>
    </div>
  );
}


