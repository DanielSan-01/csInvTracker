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
};

export default function DetailStats({ item, exteriorLabel, profitDisplay }: DetailStatsProps) {
  return (
    <div className="flex-1">
      <div className="text-xs uppercase tracking-[0.28em] text-gray-500">{exteriorLabel}</div>
      <h2 className="mt-1 text-[22px] font-semibold leading-tight text-white">{item.name}</h2>

      <div className="mt-4 grid grid-cols-2 gap-4 text-[9px] uppercase tracking-[0.28em] text-gray-500">
        <div>
          <span className="block">Market Value</span>
          <span className="mt-1 block text-[18px] font-semibold tracking-tight text-emerald-400">
            {formatPrice(item.price)}
          </span>
        </div>
        {item.cost !== undefined && (
          <div>
            <span className="block">Cost Basis</span>
            <span className="mt-1 block text-xs font-medium tracking-normal text-gray-200">
              {formatPrice(item.cost)}
            </span>
          </div>
        )}
      </div>

      <div className={`mt-3 text-xs font-medium ${profitDisplay.className}`}>
        {profitDisplay.label}: {profitDisplay.value}
      </div>
    </div>
  );
}

