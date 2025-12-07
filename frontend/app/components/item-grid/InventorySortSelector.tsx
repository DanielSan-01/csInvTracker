'use client';

import { useState } from 'react';
import type { CSItem } from '@/lib/mockData';

export type SortOption = 
  | 'price-high-low'
  | 'price-low-high'
  | 'type-a-z'
  | 'type-z-a'
  | 'name-a-z'
  | 'name-z-a';

type InventorySortSelectorProps = {
  onSortChange: (sortOption: SortOption) => void;
  currentSort: SortOption;
};

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'price-high-low', label: 'Price (High → Low)' },
  { value: 'price-low-high', label: 'Price (Low → High)' },
  { value: 'type-a-z', label: 'Type (A → Z)' },
  { value: 'type-z-a', label: 'Type (Z → A)' },
  { value: 'name-a-z', label: 'Name (A → Z)' },
  { value: 'name-z-a', label: 'Name (Z → A)' },
];

export default function InventorySortSelector({ onSortChange, currentSort }: InventorySortSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
          />
        </svg>
        <span>{sortOptions.find(opt => opt.value === currentSort)?.label || 'Sort'}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-gray-700 bg-gray-800 shadow-lg">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm text-white transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  currentSort === option.value
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function sortItems(items: CSItem[], sortOption: SortOption): CSItem[] {
  const sorted = [...items];

  switch (sortOption) {
    case 'price-high-low':
      return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    
    case 'price-low-high':
      return sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    
    case 'type-a-z':
      return sorted.sort((a, b) => {
        const typeA = a.type || '';
        const typeB = b.type || '';
        return typeA.localeCompare(typeB);
      });
    
    case 'type-z-a':
      return sorted.sort((a, b) => {
        const typeA = a.type || '';
        const typeB = b.type || '';
        return typeB.localeCompare(typeA);
      });
    
    case 'name-a-z':
      return sorted.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      });
    
    case 'name-z-a':
      return sorted.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameB.localeCompare(nameA);
      });
    
    default:
      return sorted;
  }
}

