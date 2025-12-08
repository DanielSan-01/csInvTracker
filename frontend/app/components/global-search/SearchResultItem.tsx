import type { SkinDto } from '@/lib/api';
import { getDopplerPhaseLabel, getSkinDisplayName, getRarityColor } from './utils';

type SearchResultItemProps = {
  skin: SkinDto;
  inInventory: boolean;
  isLoggedIn: boolean;
  allowDuplicateSelection: boolean;
  actionLabel: string;
  onAdd: (skin: SkinDto) => void;
};

export default function SearchResultItem({
  skin,
  inInventory,
  isLoggedIn,
  allowDuplicateSelection,
  actionLabel,
  onAdd,
}: SearchResultItemProps) {
  const phaseLabel = getDopplerPhaseLabel(skin);
  const displayName = getSkinDisplayName(skin, phaseLabel);
  const actionDisabled = !isLoggedIn || (!allowDuplicateSelection && inInventory);

  return (
    <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-700">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {skin.imageUrl && (
          <img src={skin.imageUrl} alt={skin.name} className="h-12 w-16 rounded bg-gray-900 object-contain" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{displayName}</p>
          {phaseLabel && <p className="mt-0.5 text-xs font-semibold text-emerald-300">{phaseLabel}</p>}
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs ${getRarityColor(skin.rarity)}`}>{skin.rarity}</span>
            <span className="text-xs text-gray-400">{skin.type}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actionDisabled ? (
          !isLoggedIn ? (
            <span className="px-4 py-2 text-sm font-medium text-gray-500">Login to add</span>
          ) : (
            <span className="px-4 py-2 text-sm font-medium text-green-400">✓ In Inventory</span>
          )
        ) : (
          <button
            onClick={() => onAdd(skin)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {actionLabel}
          </button>
        )}
        {allowDuplicateSelection && inInventory && (
          <span className="text-xs font-medium text-emerald-300">In Inventory</span>
        )}
      </div>
    </div>
  );
}





