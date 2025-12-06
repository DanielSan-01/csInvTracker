'use client';

import { useState, useRef, useEffect } from 'react';
import type { CSItem } from '@/lib/mockData';
import { formatFloat, getFloatColor } from '@/lib/mockData';

type DetailFloatProps = {
  item: CSItem;
  onUpdate?: (value: number) => void;
};

export default function DetailFloat({ item, onUpdate }: DetailFloatProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!onUpdate) return;
    setIsEditing(true);
    setEditValue(item.float.toString());
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
            step="0.0000001"
            min="0"
            max="1"
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
            {formatFloat(item.float, 6)}
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


