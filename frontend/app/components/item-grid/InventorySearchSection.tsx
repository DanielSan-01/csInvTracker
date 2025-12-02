import GlobalSearchBar from '../GlobalSearchBar';
import type { CSItem } from '@/lib/mockData';
import type { SkinDto } from '@/lib/api';

type InventorySearchSectionProps = {
  items: CSItem[];
  onQuickAdd: (skin: SkinDto) => void;
  onOpenAddForm: () => void;
  canAdd: boolean;
};

export default function InventorySearchSection({
  items,
  onQuickAdd,
  onOpenAddForm,
  canAdd,
}: InventorySearchSectionProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="md:flex-1">
        <GlobalSearchBar userInventory={items} onAddSkin={onQuickAdd} isLoggedIn={canAdd} />
      </div>
      {canAdd && (
        <button
          onClick={onOpenAddForm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Skin
        </button>
      )}
    </div>
  );
}


