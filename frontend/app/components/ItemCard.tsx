'use client';

import type { CSItem } from '@/lib/mockData';
import ItemCardDetailed from './ItemCardDetailed';
import ItemCardGrid from './ItemCardGrid';
import { useItemCardAnimation } from './ItemCardShared';

interface ItemCardProps {
  item: CSItem;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: (field: 'price' | 'cost' | 'float', value: number | null) => void;
  variant?: 'grid' | 'detailed';
  isSelected?: boolean;
  onQuickEdit?: (field: 'price' | 'cost' | 'float') => void;
  autoEditField?: 'price' | 'cost' | 'float' | null;
}

export default function ItemCard({
  item,
  onClick,
  onEdit,
  onDelete,
  onUpdate,
  variant = 'grid',
  isSelected = false,
  onQuickEdit,
  autoEditField,
}: ItemCardProps) {
  const animation = useItemCardAnimation(item);

  if (variant === 'detailed') {
    return (
      <ItemCardDetailed
        item={item}
        animation={animation}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdate={onUpdate}
        autoEditField={autoEditField}
      />
    );
  }

  return (
    <ItemCardGrid
      item={item}
      animation={animation}
      onClick={onClick}
      isSelected={isSelected}
      onQuickEdit={onQuickEdit}
    />
  );
}

