'use client';

import { useEffect } from 'react';
import ItemCard from '../ItemCard';
import type { CSItem } from '@/lib/mockData';

type InventoryDetailPanelProps = {
  item: CSItem | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: (field: 'price' | 'cost' | 'float', value: number | null) => void;
  autoEditField?: 'price' | 'cost' | 'float' | null;
  onClose?: () => void;
};

export default function InventoryDetailPanel({ item, onEdit, onDelete, onUpdate, autoEditField = null, onClose }: InventoryDetailPanelProps) {
  // Close modal on Escape key
  useEffect(() => {
    if (!item || !onClose) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [item, onClose]);

  // Desktop panel (hidden on mobile)
  const desktopPanel = (
    <div className="hidden lg:block lg:col-span-1">
      <div className="space-y-6 lg:sticky lg:top-8">
        {item ? (
          <ItemCard
            item={item}
            variant="detailed"
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdate={onUpdate}
            autoEditField={autoEditField}
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 p-10 text-center text-sm text-gray-400">
            Select an item from the grid to view detailed stats.
          </div>
        )}
      </div>
    </div>
  );

  // Mobile modal (shown on mobile when item is selected)
  const mobileModal = item && onClose ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 px-4 backdrop-blur-sm lg:hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-gray-600 bg-gray-800/80 p-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Item card content */}
        <div className="p-4">
          <ItemCard
            item={item}
            variant="detailed"
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdate={onUpdate}
            autoEditField={autoEditField}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {desktopPanel}
      {mobileModal}
    </>
  );
}


