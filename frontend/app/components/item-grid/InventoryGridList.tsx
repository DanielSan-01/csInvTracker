import ItemCard from '../ItemCard';
import type { CSItem } from '@/lib/mockData';

type InventoryGridListProps = {
  items: CSItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function InventoryGridList({ items, selectedId, onSelect }: InventoryGridListProps) {
  return (
    <div className="lg:col-span-2">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onClick={() => onSelect(item.id)}
            isSelected={selectedId === item.id}
            variant="grid"
          />
        ))}
      </div>
      {items.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-400">No items found</p>
        </div>
      )}
    </div>
  );
}

