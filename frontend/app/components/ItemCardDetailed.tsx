'use client';

import type { CSItem } from '@/lib/mockData';
import type { ItemCardAnimation } from './ItemCardShared';
import ItemDetailPanel from './ItemDetailPanel';

type ItemCardDetailedProps = {
  item: CSItem;
  animation: ItemCardAnimation;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function ItemCardDetailed({ item, animation, onEdit, onDelete }: ItemCardDetailedProps) {
  return <ItemDetailPanel item={item} animation={animation} onEdit={onEdit} onDelete={onDelete} />;
}

