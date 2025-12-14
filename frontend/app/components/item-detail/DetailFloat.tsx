'use client';

import { useState, useRef, useEffect } from 'react';
import type { CSItem } from '@/lib/mockData';
import { formatFloat, getFloatColor, shouldShowFloat } from '@/lib/mockData';

type DetailFloatProps = {
  item: CSItem;
  onUpdate?: (value: number) => void;
  autoEdit?: boolean;
};

export default function DetailFloat({ item, onUpdate, autoEdit = false }: DetailFloatProps) {
  // Don't show float for cases, agents, stickers, patches, or keys
  if (!shouldShowFloat(item.type)) {
    return null;
  }
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // When autoEdit is requested (e.g., from a quick-edit click in the grid),
  // automatically enter editing mode and prepare the input.
  useEffect(() => {
    if (!autoEdit || !onUpdate) return;
    setIsEditing(true);
    if (Math.abs(item.float - 0.5) < 0.000001) {
      setEditValue('');
    } else {
      setEditValue(item.float.toString());
    }
  }, [autoEdit, onUpdate, item.float]);

  const handleDoubleClick = () => {
    if (!onUpdate) return;
    setIsEditing(true);
    // If the float is still at the default/sentinel value (0.5), start with an empty input
    // so the user can type the actual float value instead of editing 0.500000.
    if (Math.abs(item.float - 0.5) < 0.000001) {
      setEditValue('');
    } else {
      setEditValue(item.float.toString());
    }
  };

  const handleBlur = () => {
    if (!onUpdate) return;
    
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
      onUpdate(numValue);
    }
    setIsEditing(false);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setEditValue('');
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-gray-800/80 bg-gray-900/90 px-4 py-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-400">
        <span>Float value</span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            step="any"
            min="0"
            max="1"
            inputMode="decimal"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-32 rounded-md border border-purple-500 bg-gray-800 px-2 py-1 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        ) : (
          <span
            onDoubleClick={handleDoubleClick}
            className={`font-mono text-sm text-white ${onUpdate ? 'cursor-pointer select-none hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors' : ''}`}
            title={onUpdate ? 'Double-click to edit' : ''}
          >
            {/* Show a clear placeholder when we only have the default/sentinel float */}
            {Math.abs(item.float - 0.5) < 0.000001 ? 'Add float' : formatFloat(item.float, 6)}
          </span>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full ${getFloatColor(item.float)}`}
          style={{ width: `${Math.min(item.float, 1) * 100}%` }}
        />
      </div>
    </div>
  );
}


