import ItemCard from '../ItemCard';
import type { CSItem } from '@/lib/mockData';

type InventoryDetailPanelProps = {
  item: CSItem | null;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function InventoryDetailPanel({ item, onEdit, onDelete }: InventoryDetailPanelProps) {
  return (
    <div className="lg:col-span-1">
      <div className="space-y-6 lg:sticky lg:top-8">
        {item ? (
          <ItemCard item={item} variant="detailed" onEdit={onEdit} onDelete={onDelete} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 p-10 text-center text-sm text-gray-400">
            Select an item from the grid to view detailed stats.
          </div>
        )}
      </div>
    </div>
  );
}


