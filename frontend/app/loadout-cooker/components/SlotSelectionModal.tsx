import type { SkinDto } from '@/lib/api';
import { determineTeamForSkin, getFallbackImageForSkin } from '../loadoutUtils';
import TeamIcon from './TeamIcon';
import type { LoadoutSlot, Team } from '../types';

type SlotSelectionModalProps = {
  slot: LoadoutSlot;
  activeTeam: Team;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  filteredSkins: SkinDto[];
  ctSkins: SkinDto[];
  tSkins: SkinDto[];
  expandedWeapon: string | null;
  onToggleExpandedWeapon: (weaponKey: string | null) => void;
  onClose: () => void;
  onSelectSkin: (skin: SkinDto) => void;
};

type DisplayEntry = {
  key: string;
  label: string;
  representative: SkinDto;
  variants: SkinDto[];
  grouped: boolean;
};

export default function SlotSelectionModal({
  slot,
  activeTeam,
  searchTerm,
  onSearchTermChange,
  filteredSkins,
  ctSkins,
  tSkins,
  expandedWeapon,
  onToggleExpandedWeapon,
  onClose,
  onSelectSkin,
}: SlotSelectionModalProps) {
  const groupedSlot = slot.key === 'knife' || slot.key === 'gloves';

  const teamSkins = groupedSlot ? filteredSkins : activeTeam === 'CT' ? ctSkins : tSkins;
  let displayEntries: DisplayEntry[] = [];

  if (groupedSlot) {
    const variantMap = new Map<string, { label: string; variants: SkinDto[] }>();
    const defaultLabel = slot.key === 'gloves' ? 'Gloves' : 'Knife';

    teamSkins.forEach((skin) => {
      const baseLabel =
        (skin.name ?? '').split('|')[0]?.trim() || skin.weapon || skin.name || defaultLabel;
      const baseKey = baseLabel.toLowerCase();

      if (!variantMap.has(baseKey)) {
        variantMap.set(baseKey, { label: baseLabel, variants: [] });
      }
      variantMap.get(baseKey)!.variants.push(skin);
    });

    displayEntries = Array.from(variantMap.entries())
      .map(([key, value]) => {
        const sortedVariants = [...value.variants].sort((a, b) =>
          (a.name ?? '').localeCompare(b.name ?? '')
        );
        return {
          key,
          label: value.label,
          representative: sortedVariants[0],
          variants: sortedVariants,
          grouped: true,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  } else {
    displayEntries = teamSkins.map((skin) => ({
      key: skin.id.toString(),
      label: skin.name,
      representative: skin,
      variants: [skin],
      grouped: false,
    }));
  }

  const teamLabel = groupedSlot
    ? slot.key === 'gloves'
      ? 'Glove Families'
      : 'Knife Families'
    : activeTeam === 'CT'
    ? 'CT Side'
    : 'T Side';
  const totalItems = displayEntries.length;

  const renderVariantButton = (variant: SkinDto) => {
    // Prioritize actual skin image from catalog, fallback to default weapon image if missing
    const variantImage = variant.imageUrl ?? getFallbackImageForSkin(variant) ?? null;
    return (
      <button
        key={variant.id}
        onClick={() => onSelectSkin(variant)}
        className="flex flex-col gap-2 rounded-2xl border border-gray-800 bg-gray-950/70 p-3 text-left transition hover:border-purple-400/60 hover:bg-gray-900"
      >
        <div className="relative h-32 w-full overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-900/10">
          {variantImage ? (
            <img src={variantImage} alt={variant.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-purple-200">
              No Image
            </div>
          )}
        </div>
        <p className="text-sm font-semibold text-white line-clamp-2">{variant.name}</p>
      </button>
    );
  };

  const renderGroupedEntry = (entry: DisplayEntry) => {
    const representative = entry.representative;
    const isExpanded = expandedWeapon === entry.key;
    // Prioritize actual skin image from catalog, fallback to default weapon image if missing
    const representativeImage =
      representative.imageUrl ?? getFallbackImageForSkin(representative) ?? null;

    return (
      <div
        key={entry.key}
        className="rounded-3xl border border-purple-500/30 bg-gray-900/70 p-4 shadow-inner shadow-purple-900/20"
      >
        <button
          onClick={() => onToggleExpandedWeapon(isExpanded ? null : entry.key)}
          className="flex w-full items-center gap-4 text-left"
        >
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-500/20 to-purple-800/20">
            {representativeImage ? (
              <img src={representativeImage} alt={entry.label} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-purple-200">
                No Image
              </div>
            )}
            <span className="absolute top-1.5 right-1.5 rounded-full bg-black/85 px-1 py-0.5 text-[9px] font-semibold text-purple-100 shadow-md shadow-purple-500/30">
              {entry.variants.length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{entry.label}</p>
              <svg
                className={`h-5 w-5 text-purple-200 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span>Tap to explore finishes</span>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {entry.variants.map((variant) => renderVariantButton(variant))}
          </div>
        )}
      </div>
    );
  };

  const renderStandardEntry = (entry: DisplayEntry) => {
    const skin = entry.representative;
    // Prioritize actual skin image from catalog, fallback to default weapon image if missing
    const skinImage = skin.imageUrl ?? getFallbackImageForSkin(skin) ?? null;
    return (
      <button
        key={entry.key}
        onClick={() => onSelectSkin(skin)}
        className="w-full rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-left transition hover:border-purple-400/60 hover:bg-gray-900"
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-purple-800/20">
            {skinImage ? (
              <img src={skinImage} alt={skin.name} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-purple-200">
                No Image
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{skin.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              {skin.collection && <span>Collection: {skin.collection}</span>}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-3xl border border-purple-500 bg-gray-950/95 p-6 shadow-2xl shadow-purple-900/40"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Select skin for {slot.label}</h3>
            <p className="text-sm text-gray-400">
              Choose a skin to add to your loadout. Items are grouped by team affiliation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-purple-500/40 bg-purple-500/10 p-2 text-purple-200 transition hover:bg-purple-500/20"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search skins..."
            className="w-full rounded-xl border border-purple-500/30 bg-gray-900/70 px-4 py-2 text-sm text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {groupedSlot ? (
                (slot.key === 'gloves' || slot.key === 'knife') && <TeamIcon team="Both" />
              ) : (
                <TeamIcon team={activeTeam} />
              )}
              <h4 className="text-sm font-semibold text-purple-200">{teamLabel}</h4>
            </div>
            <span className="text-xs text-gray-400">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
            {displayEntries.length === 0 ? (
              <p className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-500">
                {groupedSlot
                  ? 'No skins available for this slot yet.'
                  : `No ${activeTeam}-compatible skins available for this weapon.`}
              </p>
            ) : (
              displayEntries.map((entry) =>
                entry.grouped ? renderGroupedEntry(entry) : renderStandardEntry(entry)
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


