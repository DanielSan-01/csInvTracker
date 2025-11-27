import ItemCard from '@/app/components/ItemCard';
import type { CSItem } from '@/lib/mockData';

type PreviewPanelProps = {
  previewItem: CSItem;
};

export default function PreviewPanel({ previewItem }: PreviewPanelProps) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-6">
      <ItemCard item={previewItem} variant="detailed" />
      <p className="text-xs text-gray-500">
        Preview does not adjust for float-capped items.
      </p>
    </aside>
  );
}

