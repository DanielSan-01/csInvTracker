'use client';

import { useState, useRef, useEffect } from 'react';
import type { CSItem } from '@/lib/mockData';
import { formatPrice } from '@/lib/mockData';

type DetailStatsProps = {
  item: CSItem;
  exteriorLabel: string;
  profitDisplay: {
    label: string;
    value: string;
    className: string;
  };
  onUpdate?: (field: 'price' | 'cost', value: number | null) => void;
};

export default function DetailStats({ item, exteriorLabel, profitDisplay, onUpdate }: DetailStatsProps) {
  const [editingField, setEditingField] = useState<'price' | 'cost' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const priceInputRef = useRef<HTMLInputElement>(null);
  const costInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField === 'price' && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    } else if (editingField === 'cost' && costInputRef.current) {
      costInputRef.current.focus();
      costInputRef.current.select();
    }
  }, [editingField]);

  const handleDoubleClick = (field: 'price' | 'cost') => {
    if (!onUpdate) return;
    setEditingField(field);
    const currentValue = field === 'price' ? item.price : item.cost;
    setEditValue(currentValue != null ? currentValue.toString() : '');
  };

  const handleBlur = (field: 'price' | 'cost') => {
    if (!onUpdate) return;
    
    const numValue = editValue.trim() === '' ? null : parseFloat(editValue);
    if (numValue !== null && !isNaN(numValue) && numValue >= 0) {
      onUpdate(field, numValue);
    }
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'price' | 'cost') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur(field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingField(null);
      setEditValue('');
    }
  };

  return (
    <div className="flex-1">
      <div className="text-xs uppercase tracking-[0.28em] text-gray-500">{exteriorLabel}</div>
      <h2 className="mt-1 text-[22px] font-semibold leading-tight text-white">{item.name}</h2>

      <div className="mt-4 grid grid-cols-2 gap-4 text-[9px] uppercase tracking-[0.28em] text-gray-500">
        <div>
          <span className="block">Market Value</span>
          {editingField === 'price' ? (
            <input
              ref={priceInputRef}
              type="number"
              step="0.01"
              min="0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleBlur('price')}
              onKeyDown={(e) => handleKeyDown(e, 'price')}
              className="mt-1 block w-full rounded-md border border-purple-500 bg-gray-800 px-2 py-1 text-[18px] font-semibold tracking-tight text-emerald-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          ) : (
            <span
              onDoubleClick={() => handleDoubleClick('price')}
              className={`mt-1 block text-[18px] font-semibold tracking-tight text-emerald-400 ${onUpdate ? 'cursor-pointer select-none hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors' : ''}`}
              title={onUpdate ? 'Double-click to edit' : ''}
            >
            {formatPrice(item.price)}
          </span>
          )}
        </div>
        {item.cost !== undefined && (
          <div>
            <span className="block">Cost Basis</span>
            {editingField === 'cost' ? (
              <input
                ref={costInputRef}
                type="number"
                step="0.01"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleBlur('cost')}
                onKeyDown={(e) => handleKeyDown(e, 'cost')}
                className="mt-1 block w-full rounded-md border border-purple-500 bg-gray-800 px-2 py-1 text-xs font-medium tracking-normal text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <span
                onDoubleClick={() => handleDoubleClick('cost')}
                className={`mt-1 block text-xs font-medium tracking-normal text-gray-200 ${onUpdate ? 'cursor-pointer select-none hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors' : ''}`}
                title={onUpdate ? 'Double-click to edit' : ''}
              >
              {formatPrice(item.cost)}
            </span>
            )}
          </div>
        )}
      </div>

      <div className={`mt-3 text-xs font-medium ${profitDisplay.className}`}>
        {profitDisplay.label}: {profitDisplay.value}
      </div>
    </div>
  );
}

