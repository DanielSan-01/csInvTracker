import { useState, useEffect } from 'react';
import type { SkinDto } from '@/lib/api';
import { skinsApi } from '@/lib/api';
import { getDopplerPhaseLabel, getSkinDopplerDisplayName } from '@/lib/dopplerPhases';

type SkinCatalogSearchProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  catalogSkins: SkinDto[];
  loading: boolean;
  onSelectSkin: (skin: SkinDto) => void;
  selectedCatalogName: string;
};

export default function SkinCatalogSearch({
  searchTerm,
  onSearchTermChange,
  catalogSkins,
  loading,
  onSelectSkin,
  selectedCatalogName,
}: SkinCatalogSearchProps) {
  const [totalSkinCount, setTotalSkinCount] = useState<number | null>(null);
  const showDropdown = searchTerm.length >= 2;

  // Fetch total skin count on mount
  useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        const allSkins = await skinsApi.getSkins();
        setTotalSkinCount(allSkins.length);
      } catch (err) {
        console.error('Failed to fetch skin count:', err);
      }
    };
    fetchTotalCount();
  }, []);

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 shadow-inner shadow-purple-900/20 space-y-3">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-purple-200">
            Search Skin Catalog {totalSkinCount !== null ? `(${totalSkinCount.toLocaleString()} skins)` : ''}
          </p>
          <p className="text-xs text-purple-300/70">
            Search by name (e.g., "AK-47", "Dragon Lore", "Butterfly"). Selected skin will pre-fill fields.
            {totalSkinCount !== null && totalSkinCount < 50 && (
              <span className="block mt-1 text-yellow-300">
                ⚠️ Limited catalog ({totalSkinCount} skins). Import skins via Admin panel for full catalog.
              </span>
            )}
          </p>
        </div>
        {selectedCatalogName && (
          <div className="text-xs text-purple-300 bg-purple-900/40 px-2 py-1 rounded">
            Selected: {selectedCatalogName}
          </div>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Type to search (e.g., AWP, AK-47, Fade)..."
          className="flex-1 w-full rounded-lg border border-purple-400/50 bg-gray-900/60 px-4 py-2 text-sm text-purple-100 placeholder-purple-200/40 focus:border-purple-300 focus:outline-none"
        />

        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-purple-500/50 bg-gray-900 shadow-xl">
            {loading ? (
              <div className="p-4 text-center text-purple-300 text-sm">Searching...</div>
            ) : catalogSkins.length > 0 ? (
              <div className="py-1">
                {catalogSkins.slice(0, 50).map((skin) => {
                  const phaseLabel = getDopplerPhaseLabel(skin);
                  const displayName = getSkinDopplerDisplayName(skin);
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => onSelectSkin(skin)}
                      className="group flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-purple-500/20"
                    >
                      {skin.imageUrl ? (
                        <img
                          src={skin.imageUrl}
                          alt={skin.name}
                          className="h-10 w-12 rounded border border-purple-500/40 bg-gray-950/60 object-contain"
                        />
                      ) : (
                        <div className="flex h-10 w-12 items-center justify-center rounded border border-purple-500/40 bg-purple-900/40 text-xs text-purple-200">
                          No Img
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-purple-100 group-hover:text-white">{displayName}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="text-gray-400">{skin.rarity}</span>
                          {phaseLabel && (
                            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-emerald-200 font-semibold">
                              {phaseLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {catalogSkins.length > 50 && (
                  <div className="border-t border-purple-500/30 px-4 py-2 text-xs text-gray-400">
                    Showing first 50 of {catalogSkins.length} results. Type more to narrow down.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">
                {searchTerm.length >= 2 ? (
                  <>
                    <p>No skins found matching "{searchTerm}".</p>
                    {totalSkinCount !== null && totalSkinCount < 50 && (
                      <p className="mt-2 text-xs text-yellow-300">
                        The catalog appears to be empty or limited. Import skins via the Admin panel to populate the catalog.
                      </p>
                    )}
                    <p className="mt-2 text-xs">Try a different search term.</p>
                  </>
                ) : (
                  <p>Type at least 2 characters to search.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


