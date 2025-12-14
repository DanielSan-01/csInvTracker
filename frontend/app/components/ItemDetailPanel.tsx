'use client';

import type { CSItem } from '@/lib/mockData';
import { calculateProfit, calculateProfitPercentage } from '@/lib/mockData';
import {
  exteriorDetails,
  formatProfitDisplay,
  type ItemCardAnimation,
} from './ItemCardShared';
import DetailImage from './item-detail/DetailImage';
import DetailStats from './item-detail/DetailStats';
import DetailFloat from './item-detail/DetailFloat';
import DetailStickers from './item-detail/DetailStickers';
import DetailInfoPills from './item-detail/DetailInfoPills';
import DetailActions from './item-detail/DetailActions';

type ItemDetailPanelProps = {
  item: CSItem;
  animation: ItemCardAnimation;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: (field: 'price' | 'cost' | 'float', value: number | null) => void;
  autoEditField?: 'price' | 'cost' | 'float' | null;
};

export default function ItemDetailPanel({ item, animation, onEdit, onDelete, onUpdate, autoEditField = null }: ItemDetailPanelProps) {
  const profit = item.cost !== undefined ? calculateProfit(item.price, item.cost) : undefined;
  const profitPercent =
    item.cost !== undefined ? calculateProfitPercentage(item.price, item.cost) : undefined;
  const profitDisplay = formatProfitDisplay(profit, profitPercent);
  const exteriorInfo = exteriorDetails[item.exterior];

  const handlePriceUpdate = (field: 'price' | 'cost', value: number | null) => {
    if (onUpdate) {
      onUpdate(field, value);
    }
  };

  const handleFloatUpdate = (value: number) => {
    if (onUpdate) {
      onUpdate('float', value);
    }
  };

  return (
    <div
      ref={animation.cardRef}
      className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg transition-all"
      onMouseEnter={animation.handleMouseEnter}
      onMouseLeave={animation.handleMouseLeave}
    >
      <DetailImage item={item} animation={animation} />
      <div className="space-y-5 px-6 pb-6 pt-5">
        <DetailStats
          item={item}
          exteriorLabel={exteriorInfo.label}
          profitDisplay={profitDisplay}
          onUpdate={onUpdate ? handlePriceUpdate : undefined}
          autoEditField={autoEditField === 'price' || autoEditField === 'cost' ? autoEditField : null}
        />
        <DetailFloat
          item={item}
          onUpdate={onUpdate ? handleFloatUpdate : undefined}
          autoEdit={autoEditField === 'float'}
        />
        <DetailInfoPills item={item} />
        <DetailActions onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}
