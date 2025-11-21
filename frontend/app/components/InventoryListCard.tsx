'use client';

import { ReactNode } from 'react';

type InventoryListCardProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  onClick?: () => void;
  isSelected?: boolean;
  selectable?: boolean;
  actionLabel?: string;
  selectedLabel?: string;
  trailingContent?: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  className?: string;
};

export default function InventoryListCard({
  title,
  subtitle,
  imageUrl,
  onClick,
  isSelected = false,
  selectable = false,
  actionLabel = 'Tap to add',
  selectedLabel = 'Selected',
  trailingContent,
  footerLeft,
  footerRight,
  className = '',
}: InventoryListCardProps) {
  const Component = onClick ? 'button' : 'div';
  const shouldRenderTrailing = selectable || typeof trailingContent !== 'undefined';

  const baseClasses =
    'rounded-2xl border px-4 py-3 text-left transition-all bg-gray-950/50 hover:bg-gray-900/60';
  const selectedClasses =
    'border-emerald-400/60 bg-emerald-500/15 shadow-lg shadow-emerald-500/10';
  const idleClasses =
    'border-gray-800 hover:border-gray-700';
  const interactionClasses = onClick ? 'cursor-pointer' : 'cursor-default';
  const columnsClass = shouldRenderTrailing
    ? 'grid-cols-[auto,1fr,auto]'
    : 'grid-cols-[auto,1fr]';
  const bottomSpanClass = shouldRenderTrailing ? 'col-start-2 col-span-2' : 'col-start-2 col-span-1';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`grid ${columnsClass} grid-rows-[auto,auto] gap-x-4 gap-y-3 ${baseClasses} ${isSelected ? selectedClasses : idleClasses} ${interactionClasses} ${className}`}
    >
      <div className="row-span-2 flex shrink-0 items-center">
        <div
          className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-gray-900/60 p-1.5 ${
            isSelected ? 'border-emerald-400/70' : 'border-gray-800'
          }`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${title} preview`}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-widest text-gray-500">
              No image
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="truncate text-xs text-gray-400">{subtitle}</p>}
      </div>

      {shouldRenderTrailing && (
        <div className="flex items-start justify-end gap-2 text-xs text-gray-300">
          {selectable ? (
            isSelected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-emerald-200">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                {selectedLabel}
              </span>
            ) : (
              <span className="whitespace-nowrap rounded-full border border-gray-800 px-2 py-1">
                {actionLabel}
              </span>
            )
          ) : (
            trailingContent ?? null
          )}
        </div>
      )}

      <div className={`${bottomSpanClass} flex items-center justify-between text-xs text-gray-400`}>
        <div>{footerLeft}</div>
        <div className="font-semibold text-gray-200">{footerRight}</div>
      </div>
    </Component>
  );
}

