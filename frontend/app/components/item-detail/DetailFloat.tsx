import type { CSItem } from '@/lib/mockData';
import { formatFloat, getFloatColor } from '@/lib/mockData';

type DetailFloatProps = {
  item: CSItem;
};

export default function DetailFloat({ item }: DetailFloatProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-800/80 bg-gray-900/90 px-4 py-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-400">
        <span>Float value</span>
        <span className="font-mono text-sm text-white">{formatFloat(item.float, 6)}</span>
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


