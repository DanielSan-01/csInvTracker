'use client';

import type { CSItem } from '@/lib/mockData';
import type { ItemCardAnimation } from './ItemCardShared';
import ItemDetailPanel from './ItemDetailPanel';

type ItemCardDetailedProps = {
  item: CSItem;
  animation: ItemCardAnimation;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: (field: 'price' | 'cost' | 'float', value: number | null) => void;
};

export default function ItemCardDetailed({ item, animation, onEdit, onDelete, onUpdate }: ItemCardDetailedProps) {
  return <ItemDetailPanel item={item} animation={animation} onEdit={onEdit} onDelete={onDelete} onUpdate={onUpdate} />;
}

