'use client';

import { useState, useRef, useEffect } from 'react';

type GoalAffordabilityPanelProps = {
  targetSkinName: string;
  targetSkinImageUrl?: string | null;
  targetPrice: number;
  selectedTotal: number;
  parsedBalance: number;
  remainingAmount: number;
  surplusAmount: number;
  formatCurrency: (value: number) => string;
  onTargetPriceChange?: (newPrice: number) => void;
};

export default function GoalAffordabilityPanel({
  targetSkinName,
  targetSkinImageUrl,
  targetPrice,
  selectedTotal,
  parsedBalance,
  remainingAmount,
  surplusAmount,
  formatCurrency,
  onTargetPriceChange,
}: GoalAffordabilityPanelProps) {
  const [editingField, setEditingField] = useState<'targetCost' | 'stillNeeded' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const targetCostInputRef = useRef<HTMLInputElement>(null);
  const stillNeededInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField === 'targetCost' && targetCostInputRef.current) {
      targetCostInputRef.current.focus();
      targetCostInputRef.current.select();
    } else if (editingField === 'stillNeeded' && stillNeededInputRef.current) {
      stillNeededInputRef.current.focus();
      stillNeededInputRef.current.select();
    }
  }, [editingField]);

  const handleDoubleClick = (field: 'targetCost' | 'stillNeeded') => {
    if (!onTargetPriceChange) return;
    setEditingField(field);
    if (field === 'targetCost') {
      setEditValue(targetPrice.toString());
    } else {
      setEditValue(remainingAmount.toString());
    }
  };

  const handleBlur = (field: 'targetCost' | 'stillNeeded') => {
    if (!onTargetPriceChange) return;
    
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue >= 0) {
      if (field === 'targetCost') {
        onTargetPriceChange(numValue);
      } else {
        // If editing "Still Needed", calculate the new target price
        // remainingAmount = targetPrice - selectedTotal - parsedBalance
        // So: targetPrice = remainingAmount + selectedTotal + parsedBalance
        const newTargetPrice = numValue + selectedTotal + parsedBalance;
        onTargetPriceChange(newTargetPrice);
      }
    }
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'targetCost' | 'stillNeeded') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur(field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingField(null);
      setEditValue('');
    }
  };

  if (targetPrice <= 0 && !targetSkinName.trim()) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-4">
      {/* Skin Name and Image */}
      {targetSkinName.trim() && (
        <div className="space-y-3">
          {targetSkinImageUrl && (
            <div className="flex items-center justify-center rounded-xl border border-gray-800 bg-gray-950/60 p-4">
              <img
                src={targetSkinImageUrl}
                alt={targetSkinName}
                className="max-h-32 max-w-full object-contain"
                loading="lazy"
              />
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Target Skin
            </p>
            <p className="text-sm font-semibold text-white line-clamp-2">{targetSkinName}</p>
          </div>
        </div>
      )}

      {/* Affordability Breakdown */}
      {targetPrice > 0 && (
        <>
          <div className="border-t border-gray-800 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Affordability
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Target Cost</span>
                {editingField === 'targetCost' ? (
                  <input
                    ref={targetCostInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleBlur('targetCost')}
                    onKeyDown={(e) => handleKeyDown(e, 'targetCost')}
                    className="w-24 rounded-md border border-purple-500 bg-gray-800 px-2 py-1 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <span
                    onDoubleClick={() => handleDoubleClick('targetCost')}
                    className={`font-semibold text-white ${onTargetPriceChange ? 'cursor-pointer select-none hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors' : ''}`}
                    title={onTargetPriceChange ? 'Double-click to edit' : ''}
                  >
                    {formatCurrency(targetPrice)}
                  </span>
                )}
              </div>
              
              {selectedTotal > 0 && (
                <div className="flex items-center justify-between text-red-300">
                  <span>− Sales</span>
                  <span className="font-semibold">{formatCurrency(selectedTotal)}</span>
                </div>
              )}
              
              {parsedBalance > 0 && (
                <div className="flex items-center justify-between text-red-300">
                  <span>− Balance</span>
                  <span className="font-semibold">{formatCurrency(parsedBalance)}</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-800">
                {remainingAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Still Needed</span>
                    {editingField === 'stillNeeded' ? (
                      <input
                        ref={stillNeededInputRef}
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleBlur('stillNeeded')}
                        onKeyDown={(e) => handleKeyDown(e, 'stillNeeded')}
                        className="w-24 rounded-md border border-purple-500 bg-gray-800 px-2 py-1 text-sm font-bold text-red-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => handleDoubleClick('stillNeeded')}
                        className={`font-bold text-red-400 ${onTargetPriceChange ? 'cursor-pointer select-none hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors' : ''}`}
                        title={onTargetPriceChange ? 'Double-click to edit' : ''}
                      >
                        {formatCurrency(remainingAmount)}
                      </span>
                    )}
                  </div>
                ) : surplusAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Surplus</span>
                    <span className="font-bold text-emerald-400">+{formatCurrency(surplusAmount)}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Status</span>
                    <span className="font-bold text-emerald-400">Covered</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

