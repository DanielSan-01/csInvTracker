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
  variant?: 'grid' | 'detailed';
  isSelected?: boolean;
}

export default function ItemCard({
  item,
  onClick,
  onEdit,
  onDelete,
  variant = 'grid',
  isSelected = false,
}: ItemCardProps) {
  const animation = useItemCardAnimation(item);

  if (variant === 'detailed') {
    return (
      <ItemCardDetailed
        item={item}
        animation={animation}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <ItemCardGrid
      item={item}
      animation={animation}
      onClick={onClick}
      isSelected={isSelected}
    />
  );
}

