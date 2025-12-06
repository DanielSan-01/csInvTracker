'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { skinsApi, loadoutsApi } from '@/lib/api';
import type { SkinDto, LoadoutDto, LoadoutEntryDto } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { useInventory } from '@/hooks/useInventory';
// import { formatCurrency } from '@/lib/utils';
import AnimatedBanner from '@/app/components/AnimatedBanner';
import Navbar from '@/app/components/Navbar';
import SteamLoginButton from '@/app/components/SteamLoginButton';
import LoadoutHeader from './components/LoadoutHeader';
import LoadoutGridView from './components/LoadoutGridView';
import LoadoutSectionsList from './components/LoadoutSectionsList';
import SlotSelectionModal from './components/SlotSelectionModal';
import PendingChoiceModal from './components/PendingChoiceModal';
import SaveLoadoutModal from './components/SaveLoadoutModal';
import { LOADOUT_SECTIONS, determineTeamForSkin } from './loadoutUtils';
import type {
  InventoryEntry,
  LoadoutSelections,
  LoadoutSlot,
  PendingChoice,
  Team,
} from './types';


export default function LoadoutCookerPage() {
  const [skins, setSkins] = useState<SkinDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<LoadoutSlot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selections, setSelections] = useState<LoadoutSelections>({});
  const [activeTeam, setActiveTeam] = useState<Team>('CT');
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('grid');
  const [expandedWeapon, setExpandedWeapon] = useState<string | null>(null);
  const { user } = useUser();
  const {
    items: inventoryItems,
    loading: inventoryLoading,
    error: inventoryError,
  } = useInventory(user?.id);
  const [inventoryUsages, setInventoryUsages] = useState<Record<number, number>>({});
  const [pendingChoices, setPendingChoices] = useState<PendingChoice[]>([]);
  const [equipFeedback, setEquipFeedback] = useState<string | null>(null);
  const [inventoryErrorBanner, setInventoryErrorBanner] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [loadoutName, setLoadoutName] = useState('');
  const [isSavingLoadout, setIsSavingLoadout] = useState(false);
  const [loadoutError, setLoadoutError] = useState<string | null>(null);
  const [savedLoadouts, setSavedLoadouts] = useState<LoadoutDto[]>([]);
  const [loadingLoadouts, setLoadingLoadouts] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  const skinById = useMemo(() => {
    const map = new Map<number, SkinDto>();
    skins.forEach((skin) => map.set(skin.id, skin));
    return map;
  }, [skins]);

  useEffect(() => {
    if (inventoryError) {
      setInventoryErrorBanner(inventoryError);
    } else {
      setInventoryErrorBanner(null);
    }
  }, [inventoryError]);

  const inventoryEntries = useMemo<InventoryEntry[]>(() => {
    return inventoryItems
      .map((item) => {
        const existingSkin = skinById.get(item.skinId);
        const fallbackSkin: SkinDto =
          existingSkin ?? {
            id: item.skinId,
            name: item.skinName,
            rarity: item.rarity,
            type: item.type,
            collection: item.collection ?? undefined,
            weapon: item.weapon ?? undefined,
            imageUrl: item.imageUrl ?? undefined,
            defaultPrice: item.price,
          };
        const team = determineTeamForSkin(fallbackSkin);
        const maxUsage = team === 'Both' ? 2 : 1;
        return {
          inventoryId: item.id,
          skin: fallbackSkin,
          team,
          maxUsage,
        };
      })
      .filter((entry) =>
        LOADOUT_SECTIONS.some((section) =>
          section.slots.some((slot) => slot.filter(entry.skin))
        )
      );
  }, [inventoryItems, skinById]);

  const currentChoice = pendingChoices[0] ?? null;

  const buildLoadoutEntries = useCallback((): LoadoutEntryDto[] => {
    const entries: LoadoutEntryDto[] = [];

    Object.entries(selections).forEach(([slotKey, selection]) => {
      if (selection.ct) {
        entries.push({
          slotKey,
          team: 'CT',
          inventoryItemId: selection.ct.inventoryId ?? null,
          skinId: selection.ct.skin.id,
          skinName: selection.ct.skin.name,
          imageUrl: selection.ct.skin.imageUrl ?? null,
          weapon: selection.ct.skin.weapon ?? null,
          type: selection.ct.skin.type ?? null,
        });
      }
      if (selection.t) {
        entries.push({
          slotKey,
          team: 'T',
          inventoryItemId: selection.t.inventoryId ?? null,
          skinId: selection.t.skin.id,
          skinName: selection.t.skin.name,
          imageUrl: selection.t.skin.imageUrl ?? null,
          weapon: selection.t.skin.weapon ?? null,
          type: selection.t.skin.type ?? null,
        });
      }
    });

    return entries;
  }, [selections]);

  const handleOpenSaveModal = useCallback(() => {
    if (!user?.id) {
      setEquipFeedback('Sign in to save loadouts.');
      return;
    }

    if (pendingChoices.length > 0) {
      setEquipFeedback('Resolve pending inventory choices before saving.');
      return;
    }

    const entries = buildLoadoutEntries();
    if (entries.length === 0) {
      setEquipFeedback('Select at least one skin before saving.');
      return;
    }

    const defaultName =
      loadoutName.trim().length > 0
        ? loadoutName
        : `Loadout ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    setLoadoutName(defaultName);
    setLoadoutError(null);
    setIsSaveModalOpen(true);
  }, [user?.id, pendingChoices.length, buildLoadoutEntries, loadoutName]);

  const handleCloseSaveModal = useCallback(() => {
    setIsSaveModalOpen(false);
    setLoadoutError(null);
  }, []);

  const handleSaveLoadout = useCallback(async (loadoutId?: string) => {
    if (!user?.id) {
      setLoadoutError('Sign in to save loadouts.');
      return;
    }

    const entries = buildLoadoutEntries();
    if (entries.length === 0) {
      setLoadoutError('Select at least one skin before saving.');
      return;
    }

    const trimmedName = loadoutName.trim();
    const finalName =
      trimmedName.length > 0
        ? trimmedName
        : `Loadout ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

    const payload: LoadoutDto = {
      id: loadoutId || '00000000-0000-0000-0000-000000000000', // Empty GUID for new loadouts
      userId: user.id,
      name: finalName,
      entries,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSavingLoadout(true);
    setLoadoutError(null);
    try {
      await loadoutsApi.upsertLoadout(payload);
      setEquipFeedback('Loadout saved to favorites.');
      setIsSaveModalOpen(false);
      setLoadoutName('');
      
      // Refresh saved loadouts
      const loadouts = await loadoutsApi.getLoadouts(user.id);
        const sorted = loadouts
            .sort((a, b) => {
              const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
              const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
              return timeB - timeA;
            })
            .slice(0, 2);
      setSavedLoadouts(sorted);
    } catch (err) {
      setLoadoutError(err instanceof Error ? err.message : 'Failed to save loadout.');
    } finally {
      setIsSavingLoadout(false);
    }
  }, [user?.id, buildLoadoutEntries, loadoutName]);

  const handleLoadLoadout = useCallback((loadout: LoadoutDto) => {
    // Convert loadout entries back to selections format
    const newSelections: LoadoutSelections = {};
    
    loadout.entries.forEach((entry) => {
      const slotKey = entry.slotKey;
      const teamKey = entry.team.toLowerCase() as 'ct' | 't';
      
      // Find the skin from our catalog
      const skin = skins.find(s => s.id === entry.skinId) || {
        id: entry.skinId || 0,
        name: entry.skinName,
        rarity: '',
        type: entry.type || '',
        collection: undefined,
        weapon: entry.weapon,
        imageUrl: entry.imageUrl,
        defaultPrice: 0,
      } as SkinDto;

      if (!newSelections[slotKey]) {
        newSelections[slotKey] = {};
      }
      
      newSelections[slotKey][teamKey] = {
        skin,
        inventoryId: entry.inventoryItemId ?? undefined,
      };
    });

    setSelections(newSelections);
    setIsSaveModalOpen(false);
    setEquipFeedback(`Loaded "${loadout.name}"`);
  }, [skins]);

  const handleDeleteLoadout = useCallback(async (loadoutId: string) => {
    if (!user?.id) return;

    try {
      await loadoutsApi.deleteLoadout(loadoutId);
      setEquipFeedback('Loadout deleted.');
      
      // Refresh saved loadouts
      const loadouts = await loadoutsApi.getLoadouts(user.id);
      const sorted = loadouts
        .sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, 2);
      setSavedLoadouts(sorted);
      
      // After deleting, if user has a name entered, they can now save
      if (loadoutName.trim().length > 0) {
        // Auto-save after deletion if name is provided
        setTimeout(() => {
          handleSaveLoadout();
        }, 100);
      }
    } catch (err) {
      setLoadoutError(err instanceof Error ? err.message : 'Failed to delete loadout.');
    }
  }, [user?.id, loadoutName, handleSaveLoadout]);

  const handleEquipInventory = useCallback(() => {
    if (!user?.id) {
      setEquipFeedback('Sign in to equip your inventory.');
      return;
    }

    if (inventoryLoading) {
      setEquipFeedback('Inventory is still loading...');
      return;
    }

    if (inventoryEntries.length === 0) {
      setEquipFeedback('No inventory items available to equip.');
      setSelections({});
      setInventoryUsages({});
      setPendingChoices([]);
      return;
    }

    setActiveSlot(null);
    setSearchTerm('');
    setExpandedWeapon(null);

    const usage: Record<number, number> = {};
    const nextSelections: LoadoutSelections = {};
    const pending: PendingChoice[] = [];

    const ensureSlot = (slotKey: string) => {
      if (!nextSelections[slotKey]) {
        nextSelections[slotKey] = {};
      }
    };

    LOADOUT_SECTIONS.forEach((section) => {
      section.slots.forEach((slot) => {
        const slotEntries = inventoryEntries.filter((entry) => slot.filter(entry.skin));
        if (slotEntries.length === 0) {
          return;
        }

        ensureSlot(slot.key);

        const teams: ('CT' | 'T')[] =
          slot.teamHint === 'CT' ? ['CT'] : slot.teamHint === 'T' ? ['T'] : ['CT', 'T'];

        teams.forEach((team) => {
          const candidates = slotEntries.filter(
            (entry) => entry.team === team || entry.team === 'Both'
          );

          const usable = candidates.filter(
            (entry) => (usage[entry.inventoryId] ?? 0) < entry.maxUsage
          );

          if (usable.length === 0) {
            return;
          }

          if (usable.length === 1) {
            const chosen = usable[0];
            const key = team === 'CT' ? 'ct' : 't';
            nextSelections[slot.key] = {
              ...(nextSelections[slot.key] ?? {}),
              [key]: { skin: chosen.skin, inventoryId: chosen.inventoryId },
            };
            usage[chosen.inventoryId] = (usage[chosen.inventoryId] ?? 0) + 1;
          } else {
            pending.push({ slot, team, options: usable });
          }
        });
      });
    });

    const assignedCount = Object.values(nextSelections).reduce((count, entry) => {
      return count + (entry.ct ? 1 : 0) + (entry.t ? 1 : 0);
    }, 0);

    if (assignedCount === 0 && pending.length === 0) {
      setEquipFeedback('No matching inventory items found for the loadout.');
      setSelections({});
      setInventoryUsages({});
      setPendingChoices([]);
      return;
    }

    setSelections(nextSelections);
    setInventoryUsages(usage);
    setPendingChoices(pending);

    if (pending.length > 0) {
      setEquipFeedback('Select which skins should go to each side.');
    } else {
      setEquipFeedback('Inventory equipped successfully.');
    }
  }, [user?.id, inventoryLoading, inventoryEntries]);

  const handleChoiceSelection = useCallback(
    (inventoryId: number) => {
      const choice = pendingChoices[0];
      if (!choice) return;

      const option = choice.options.find((opt) => opt.inventoryId === inventoryId);
      if (!option) return;

      const teamKey = choice.team === 'CT' ? 'ct' : 't';
      const prevEntry = selections[choice.slot.key]?.[teamKey];

      const nextUsage = { ...inventoryUsages };
      if (prevEntry?.inventoryId != null) {
        nextUsage[prevEntry.inventoryId] = Math.max(
          (nextUsage[prevEntry.inventoryId] ?? 1) - 1,
          0
        );
      }
      nextUsage[option.inventoryId] = (nextUsage[option.inventoryId] ?? 0) + 1;

      setInventoryUsages(nextUsage);
      setSelections((prev) => ({
        ...prev,
        [choice.slot.key]: {
          ...(prev[choice.slot.key] ?? {}),
          [teamKey]: { skin: option.skin, inventoryId: option.inventoryId },
        },
      }));

      const remaining = pendingChoices
        .slice(1)
        .map((pendingChoice) => {
          const filtered = pendingChoice.options.filter(
            (opt) => (nextUsage[opt.inventoryId] ?? 0) < opt.maxUsage
          );
          return filtered.length === 0 ? null : { ...pendingChoice, options: filtered };
        })
        .filter((pendingChoice): pendingChoice is PendingChoice => pendingChoice !== null);

      setPendingChoices(remaining);
      if (remaining.length === 0) {
        setEquipFeedback('Inventory equipped successfully.');
      }
    },
    [pendingChoices, selections, inventoryUsages]
  );

  const handleSkipChoice = useCallback(() => {
    setPendingChoices((prev) => {
      const [, ...rest] = prev;
      if (rest.length === 0) {
        setEquipFeedback('Inventory equip process finished.');
      }
      return rest;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSkins = async () => {
      try {
        setLoading(true);
        const response = await skinsApi.getSkins();
        if (!cancelled) {
          setSkins(response);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError('Failed to load skins. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSkins();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setExpandedWeapon(null);
  }, [activeSlot, searchTerm]);

  const slotSkins = useMemo(() => {
    if (!activeSlot) return [] as SkinDto[];
    return skins.filter(activeSlot.filter);
  }, [activeSlot, skins]);

  const filteredSlotSkins = useMemo(() => {
    if (!searchTerm) return slotSkins;
    const lower = searchTerm.toLowerCase();
    return slotSkins.filter((skin) => skin.name.toLowerCase().includes(lower) || (skin.weapon ?? '').toLowerCase().includes(lower));
  }, [slotSkins, searchTerm]);

  const ctSkins = useMemo(() => {
    if (!activeSlot) return [] as SkinDto[];
    return filteredSlotSkins.filter((skin) => {
      const team = determineTeamForSkin(skin, activeSlot);
      return team === 'CT' || team === 'Both';
    });
  }, [filteredSlotSkins, activeSlot]);

  const tSkins = useMemo(() => {
    if (!activeSlot) return [] as SkinDto[];
    return filteredSlotSkins.filter((skin) => {
      const team = determineTeamForSkin(skin, activeSlot);
      return team === 'T' || team === 'Both';
    });
  }, [filteredSlotSkins, activeSlot]);

  const isModalOpen = !!activeSlot;

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'grid' ? 'card' : 'grid'));
  }, []);

  const handleCloseSlotModal = useCallback(() => {
    setActiveSlot(null);
    setSearchTerm('');
    setExpandedWeapon(null);
  }, []);

  const handleSelectSkin = (skin: SkinDto) => {
    if (!activeSlot) return;

    const teamKey = activeTeam === 'CT' ? 'ct' : 't';
    const prevEntry = selections[activeSlot.key]?.[teamKey];
    const prevInventoryId = prevEntry?.inventoryId;

    if (prevInventoryId != null) {
      setInventoryUsages((prev) => {
        const next = { ...prev };
        next[prevInventoryId] = Math.max((next[prevInventoryId] ?? 1) - 1, 0);
        return next;
      });
    }

    setSelections((prev) => ({
      ...prev,
      [activeSlot.key]: {
        ...(prev[activeSlot.key] ?? {}),
        [teamKey]: { skin, inventoryId: undefined },
      },
    }));

    setPendingChoices((prev) =>
      prev.filter(
        (choice) =>
          !(
            choice.slot.key === activeSlot.key &&
            choice.team === (activeTeam === 'CT' ? 'CT' : 'T')
          )
      )
    );

    handleCloseSlotModal();
  };

  const isGridView = viewMode === 'grid';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar
        isAuthenticated={!!user}
        authControl={<SteamLoginButton />}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <LoadoutHeader
          activeTeam={activeTeam}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          onTeamChange={setActiveTeam}
          onSave={handleOpenSaveModal}
          onEquip={handleEquipInventory}
          inventoryLoading={inventoryLoading}
          canEquip={Boolean(user?.id)}
        />

        <div className="pointer-events-none fixed right-6 top-6 z-50 flex flex-col gap-3">
          {inventoryErrorBanner && (
            <div className="pointer-events-auto">
              <AnimatedBanner
                key={`inventory-error-${inventoryErrorBanner}`}
                message={inventoryErrorBanner}
                intent="error"
                autoClose={false}
                onDismiss={() => setInventoryErrorBanner(null)}
              />
            </div>
          )}
          {equipFeedback && (
            <div className="pointer-events-auto">
              <AnimatedBanner
                key={`equip-feedback-${equipFeedback}`}
                message={equipFeedback}
                intent="success"
                onDismiss={() => setEquipFeedback(null)}
                autoClose
                closeDelay={3}
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-gray-400">
            Loading skins...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
            {error}
          </div>
        ) : isGridView ? (
          <LoadoutGridView
            sections={LOADOUT_SECTIONS}
            activeTeam={activeTeam}
            selections={selections}
            onSlotClick={(slot) => setActiveSlot(slot)}
          />
        ) : (
          <LoadoutSectionsList
            sections={LOADOUT_SECTIONS}
            activeTeam={activeTeam}
            selections={selections}
            onSlotClick={(slot) => setActiveSlot(slot)}
          />
        )}
      </div>
      {isModalOpen && activeSlot && (
        <SlotSelectionModal
          slot={activeSlot}
          activeTeam={activeTeam}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          filteredSkins={filteredSlotSkins}
          ctSkins={ctSkins}
          tSkins={tSkins}
          expandedWeapon={expandedWeapon}
          onToggleExpandedWeapon={setExpandedWeapon}
          onClose={handleCloseSlotModal}
          onSelectSkin={handleSelectSkin}
        />
      )}
      {currentChoice && (
        <PendingChoiceModal
          choice={currentChoice}
          onSelect={handleChoiceSelection}
          onSkip={handleSkipChoice}
        />
      )}
      {isSaveModalOpen && (
        <SaveLoadoutModal
          name={loadoutName}
          error={loadoutError}
          isSaving={isSavingLoadout}
          existingLoadouts={savedLoadouts}
          onNameChange={setLoadoutName}
          onClose={handleCloseSaveModal}
          onSave={handleSaveLoadout}
          onLoad={handleLoadLoadout}
          onDelete={handleDeleteLoadout}
        />
      )}
      {isLoadModalOpen && (
        <SaveLoadoutModal
          name=""
          error={null}
          isSaving={false}
          existingLoadouts={savedLoadouts}
          onNameChange={() => {}}
          onClose={() => setIsLoadModalOpen(false)}
          onSave={() => {}}
          onLoad={handleLoadLoadout}
          onDelete={handleDeleteLoadout}
        />
      )}
    </div>
  );
}


