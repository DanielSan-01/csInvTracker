import type { SkinDto } from '@/lib/api';
import SearchResultItem from './SearchResultItem';

type SearchResultsDropdownProps = {
  skins: SkinDto[];
  isLoading: boolean;
  searchTerm: string;
  isLoggedIn: boolean;
  inventoryContains: (skinId: number) => boolean;
  allowDuplicateSelection: boolean;
  actionLabel: string;
  onAdd: (skin: SkinDto) => void;
};

export default function SearchResultsDropdown({
  skins,
  isLoading,
  searchTerm,
  isLoggedIn,
  inventoryContains,
  allowDuplicateSelection,
  actionLabel,
  onAdd,
}: SearchResultsDropdownProps) {
  if (!isLoading && skins.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p className="mb-2 text-lg">🔍 No skins found</p>
        <p className="text-sm">Try search terms like &quot;Karambit Doppler&quot; or &quot;AWP Dragon Lore&quot;</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {skins.map((skin) => (
        <SearchResultItem
          key={skin.id}
          skin={skin}
          inInventory={inventoryContains(skin.id)}
          isLoggedIn={isLoggedIn}
          allowDuplicateSelection={allowDuplicateSelection}
          actionLabel={actionLabel}
          onAdd={onAdd}
        />
      ))}
      {isLoading && skins.length === 0 && (
        <div className="p-4 text-center text-sm text-gray-500">Searching for “{searchTerm}”...</div>
      )}
    </div>
  );
}











