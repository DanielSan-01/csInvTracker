import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_CSMARKET_CODES, CsMarketInfo } from '@/lib/csMarket';

interface MarketSelectorProps {
  value: string[];
  onChange: (markets: string[]) => void;
}

const MarketSelector = ({ value, onChange }: MarketSelectorProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
    };
  }, [open]);

  const selectedSet = useMemo(() => new Set(value.map(code => code.toUpperCase())), [value]);

  const toggleMarket = (code: string) => {
    const upper = code.toUpperCase();
    const total = ALL_CSMARKET_CODES.length;
    let next = new Set(selectedSet);

    if (selectedSet.size === 0) {
      next = new Set(ALL_CSMARKET_CODES.map(m => m.code.toUpperCase()));
    }

    if (next.has(upper)) {
      next.delete(upper);
    } else {
      next.add(upper);
    }

    if (next.size === 0 || next.size === total) {
      onChange([]);
    } else {
      onChange(Array.from(next));
    }
  };

  const handleSelectAll = () => {
    onChange([]);
    setOpen(false);
  };

  const selectedCount = selectedSet.size;
  const selectionLabel =
    selectedCount === 0
      ? 'All markets'
      : `${selectedCount} market${selectedCount === 1 ? '' : 's'}`;

  const renderMarketRow = (market: CsMarketInfo) => {
    const total = ALL_CSMARKET_CODES.length;
    const allSelected = selectedSet.size === 0 || selectedSet.size === total;
    const checked = allSelected || selectedSet.has(market.code.toUpperCase());

    return (
      <label
        key={market.code}
        className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/5"
      >
        <input
          type="checkbox"
          checked={checked || selectedSet.size === 0 && false}
          onChange={() => toggleMarket(market.code)}
          className="mt-1 h-4 w-4 accent-orange-500"
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">{market.label}</span>
          <span className="text-xs text-gray-400">
            {market.code} · {market.description}
          </span>
        </div>
      </label>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 12h18M3 20h18" />
        </svg>
        {selectionLabel}
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 12 8" fill="none">
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-white/10 bg-gray-950/95 p-3 shadow-xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-gray-400">
              CSMarket marketplaces
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300"
            >
              Use all
            </button>
          </div>

          <div className="grid max-h-64 gap-1 overflow-y-auto pr-1">
            {ALL_CSMARKET_CODES.map(renderMarketRow)}
          </div>

          {selectedSet.size > 0 && (
            <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400">
              Only the selected marketplaces will be queried. Leave empty to use the full CSMarket dataset.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketSelector;

