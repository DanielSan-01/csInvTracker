'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { skinsApi, loadoutsApi } from '@/lib/api';
import type { SkinDto, LoadoutDto, LoadoutEntryDto } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { useInventory } from '@/hooks/useInventory';
// import { formatCurrency } from '@/lib/utils';

type Team = 'CT' | 'T' | 'Both';

type LoadoutSlot = {
  key: string;
  label: string;
  description?: string;
  filter: (skin: SkinDto) => boolean;
  teamHint?: Team;
};

type LoadoutSection = {
  title: string;
  slots: LoadoutSlot[];
};

type LoadoutSelectionEntry = {
  skin: SkinDto;
  inventoryId?: number;
};

type SlotTeamSelection = {
  ct?: LoadoutSelectionEntry;
  t?: LoadoutSelectionEntry;
};

type LoadoutSelections = Record<string, SlotTeamSelection>;

type InventoryEntry = {
  inventoryId: number;
  skin: SkinDto;
  team: Team;
  maxUsage: number;
};

type PendingChoice = {
  slot: LoadoutSlot;
  team: 'CT' | 'T';
  options: InventoryEntry[];
};

const TEAM_BY_WEAPON: Record<string, Team> = {
  'AK-47': 'T',
  'Galil AR': 'T',
  'Glock-18': 'T',
  'Tec-9': 'T',
  'MAC-10': 'T',
  'Sawed-Off': 'T',
  'PP-Bizon': 'Both',
  'MP7': 'Both',
  'MP5-SD': 'Both',
  'UMP-45': 'Both',
  'P90': 'Both',
  'Nova': 'Both',
  'XM1014': 'Both',
  'MP9': 'CT',
  'MAG-7': 'CT',
  'M249': 'Both',
  'Negev': 'Both',
  'FAMAS': 'CT',
  'AUG': 'CT',
  'M4A4': 'CT',
  'M4A1-S': 'CT',
  'USP-S': 'CT',
  'P2000': 'CT',
  'Five-SeveN': 'CT',
  'SCAR-20': 'CT',
  'SG 553': 'T',
  'Desert Eagle': 'Both',
  'R8 Revolver': 'Both',
  'Dual Berettas': 'Both',
  'P250': 'Both',
  'CZ75-Auto': 'Both',
  'AWP': 'Both',
  'G3SG1': 'T',
  'SSG 08': 'Both',
};

const TEAM_ICONS: Record<'CT' | 'T', string> = {
  CT: '/photos/ct.png',
  T: '/photos/t.png',
};

const KNIFE_KEYWORDS = [
  'knife',
  'bayonet',
  'karambit',
  'dagger',
  'talon',
  'ursus',
  'navaja',
  'huntsman',
  'butterfly',
  'falchion',
  'stiletto',
  'paracord',
  'survival',
  'm9',
  'gut',
  'flip',
  'bowie',
];

const NON_KNIFE_KEYWORDS = [
  'capsule',
  'case',
  'key',
  'sticker',
  'graffiti',
  'charm',
  'music kit',
  'patch',
  'pin',
];

const matchesKnifeType = (skin: SkinDto) => {
  const lowerName = (skin.name ?? '').toLowerCase();
  const lowerWeapon = (skin.weapon ?? '').toLowerCase();
  const lowerType = (skin.type ?? '').toLowerCase();

  if (
    NON_KNIFE_KEYWORDS.some(
      (keyword) =>
        lowerName.includes(keyword) || lowerWeapon.includes(keyword) || lowerType.includes(keyword)
    )
  ) {
    return false;
  }

  const typeIsKnife = lowerType.includes('knife');
  const weaponMatches = KNIFE_KEYWORDS.some((keyword) => lowerWeapon.includes(keyword));
  const nameMatches = KNIFE_KEYWORDS.some((keyword) => lowerName.includes(keyword));

  return typeIsKnife || weaponMatches || nameMatches;
};

const matchesGloveType = (skin: SkinDto) => {
  const lowerName = (skin.name ?? '').toLowerCase();
  const lowerWeapon = (skin.weapon ?? '').toLowerCase();
  const lowerType = (skin.type ?? '').toLowerCase();

  return (
    lowerType.includes('glove') ||
    lowerWeapon.includes('glove') ||
    lowerName.includes('glove')
  );
};

const classifyAgentSide = (skin: SkinDto): Team | null => {
  const normalized = (skin.name ?? '').toLowerCase();

  const isCT = CT_AGENT_PATTERNS.some((pattern) => normalized.includes(pattern));
  const isT = T_AGENT_PATTERNS.some((pattern) => normalized.includes(pattern));

  if (isCT && !isT) {
    return 'CT';
  }

  if (isT && !isCT) {
    return 'T';
  }

  return null;
};

const matchesAgentType = (skin: SkinDto) =>
  (skin.type ?? '').toLowerCase().includes('agent') && classifyAgentSide(skin) !== null;

const TeamIcon = ({
  team,
  className = '',
  size = 'h-4 w-4',
}: {
  team: Team | 'Both';
  className?: string;
  size?: string;
}) => {
  if (team === 'Both') {
    return (
      <span className={`flex items-center gap-1 ${className}`}>
        <img
          src={TEAM_ICONS.CT}
          alt="CT emblem"
          className={`${size} rounded-full border border-purple-500/40 bg-black/40 p-0.5`}
        />
        <img
          src={TEAM_ICONS.T}
          alt="T emblem"
          className={`${size} rounded-full border border-purple-500/40 bg-black/40 p-0.5`}
        />
      </span>
    );
  }

  const src = team === 'CT' ? TEAM_ICONS.CT : team === 'T' ? TEAM_ICONS.T : undefined;
  if (!src) return null;

  return (
    <img
      src={src}
      alt={`${team} emblem`}
      className={`${size} rounded-full border border-purple-500/40 bg-black/40 p-0.5 ${className}`}
    />
  );
};

const CT_AGENT_PATTERNS = [
  "special agent ava",
  "michael syfers",
  "operator (swat)",
  "markus delrow",
  "chem-haz specialist",
  "lieutenant 'tree hugger' farlow",
  "bio-haz specialist",
  "1st lieutenant farlow",
  "sergeant bombson",
  "john 'van healen'",
  "d squadron officer",
  "seal team 6 soldier",
  "lt. commander ricksaw",
  "cmdr. davida 'goggles' fernandez",
  "cmdr. frank 'wet sox' baroud",
  "lieutenant rex krikey",
  "officer jacquess beltram",
  "chem-haz capitaine",
  "chef d'escadron rouchard",
  "sous-lieutenant medic",
  "two times' mccoy",
  "3rd commando company",
  "'blueberries' buckshot",
  "tacp cavalry",
  "usaf tacp",
];

const T_AGENT_PATTERNS = [
  "number k",
  "the doctor' romanov",
  "sir bloody loudmouth darryl",
  "sir bloody miami darryl",
  "sir bloody silent darryl",
  "sir bloody darryl royale",
  "little kev",
  "safecracker voltzmann",
  "sir bloody skullhead darryl",
  "bloody darryl the strapped",
  "getaway sally",
  "the elite mr. muhlik",
  "prof. shahmat",
  "rezan the ready",
  "street soldier",
  "ground rebel",
  "elite trapper soliman",
  "trapper aggressor",
  "jungle rebel",
  "dragomir",
  "enforcer",
  "col. mangos dabisi",
  "trapper",
  "crosswater the forgotten",
  "osiris",
  "slingshot",
  "rezan the redshirt",
  "maximus",
  "vypa sista of the revolution",
  "arno the overgrown",
  "medium rare' crasswater",
];

const determineAgentTeam = (skin: SkinDto): Team => {
  const side = classifyAgentSide(skin);
  return side ?? 'Both';
};

const LOADOUT_SECTIONS: LoadoutSection[] = [
  {
    title: 'Body Equipment',
    slots: [
      {
        key: 'knife',
        label: 'Knife',
        description: 'Primary melee weapon',
        filter: matchesKnifeType,
      },
      {
        key: 'gloves',
        label: 'Gloves',
        description: 'Show off your style',
        filter: matchesGloveType,
      },
      {
        key: 'agent',
        label: 'Agent',
        description: 'Choose your character model',
        filter: matchesAgentType,
      },
    ],
  },
  {
    title: 'Pistols',
    slots: [
      {
        key: 'glock-18',
        label: 'Glock-18',
        filter: (skin) => matchWeapon(skin, 'Glock-18'),
        teamHint: 'T',
      },
      {
        key: 'usp-s',
        label: 'USP-S',
        filter: (skin) => matchWeapon(skin, 'USP-S'),
        teamHint: 'CT',
      },
      {
        key: 'p2000',
        label: 'P2000',
        filter: (skin) => matchWeapon(skin, 'P2000'),
        teamHint: 'CT',
      },
      {
        key: 'p250',
        label: 'P250',
        filter: (skin) => matchWeapon(skin, 'P250'),
      },
      {
        key: 'dual-berettas',
        label: 'Dual Berettas',
        filter: (skin) => matchWeapon(skin, 'Dual Berettas'),
      },
      {
        key: 'five-seven',
        label: 'Five-SeveN',
        filter: (skin) => matchWeapon(skin, 'Five-SeveN'),
        teamHint: 'CT',
      },
      {
        key: 'tec-9',
        label: 'Tec-9',
        filter: (skin) => matchWeapon(skin, 'Tec-9'),
        teamHint: 'T',
      },
      {
        key: 'cz75-auto',
        label: 'CZ75-Auto',
        filter: (skin) => matchWeapon(skin, 'CZ75-Auto'),
      },
      {
        key: 'desert-eagle',
        label: 'Desert Eagle / R8',
        filter: (skin) => matchWeapon(skin, 'Desert Eagle') || matchWeapon(skin, 'R8 Revolver'),
      },
    ],
  },
  {
    title: 'Mid-Tier',
    slots: [
      {
        key: 'mp9',
        label: 'MP9 / MAC-10',
        filter: (skin) => matchWeapon(skin, 'MP9') || matchWeapon(skin, 'MAC-10'),
      },
      {
        key: 'mp5',
        label: 'MP5 / MP7',
        filter: (skin) => matchWeapon(skin, 'MP5-SD') || matchWeapon(skin, 'MP7'),
      },
      {
        key: 'ump-45',
        label: 'UMP-45',
        filter: (skin) => matchWeapon(skin, 'UMP-45'),
      },
      {
        key: 'p90',
        label: 'P90',
        filter: (skin) => matchWeapon(skin, 'P90'),
      },
      {
        key: 'pp-bizon',
        label: 'PP-Bizon',
        filter: (skin) => matchWeapon(skin, 'PP-Bizon'),
      },
      {
        key: 'nova',
        label: 'Nova / XM1014',
        filter: (skin) => matchWeapon(skin, 'Nova') || matchWeapon(skin, 'XM1014'),
      },
      {
        key: 'mag-7',
        label: 'MAG-7 / Sawed-Off',
        filter: (skin) => matchWeapon(skin, 'MAG-7') || matchWeapon(skin, 'Sawed-Off'),
      },
    ],
  },
  {
    title: 'Rifles',
    slots: [
      {
        key: 'ak-47',
        label: 'AK-47',
        filter: (skin) => matchWeapon(skin, 'AK-47'),
        teamHint: 'T',
      },
      {
        key: 'm4a4',
        label: 'M4A4',
        filter: (skin) => matchWeapon(skin, 'M4A4'),
        teamHint: 'CT',
      },
      {
        key: 'm4a1-s',
        label: 'M4A1-S',
        filter: (skin) => matchWeapon(skin, 'M4A1-S'),
        teamHint: 'CT',
      },
      {
        key: 'famas',
        label: 'FAMAS',
        filter: (skin) => matchWeapon(skin, 'FAMAS'),
        teamHint: 'CT',
      },
      {
        key: 'galil-ar',
        label: 'Galil AR',
        filter: (skin) => matchWeapon(skin, 'Galil AR'),
        teamHint: 'T',
      },
      {
        key: 'awp',
        label: 'AWP',
        filter: (skin) => matchWeapon(skin, 'AWP'),
      },
      {
        key: 'ssg-08',
        label: 'SSG 08',
        filter: (skin) => matchWeapon(skin, 'SSG 08'),
      },
      {
        key: 'scar-g3sg1',
        label: 'SCAR-20 / G3SG1',
        filter: (skin) => matchWeapon(skin, 'SCAR-20') || matchWeapon(skin, 'G3SG1'),
      },
      {
        key: 'm249-negev',
        label: 'M249 / Negev',
        filter: (skin) => matchWeapon(skin, 'M249') || matchWeapon(skin, 'Negev'),
      },
    ],
  },
];

const matchWeapon = (skin: SkinDto, weaponName: string) =>
  (skin.weapon ?? '').toLowerCase() === weaponName.toLowerCase();

const determineTeamForSkin = (skin: SkinDto, slot?: LoadoutSlot): Team => {
  if (slot?.key === 'agent') {
    return determineAgentTeam(skin);
  }

  const weapon = skin.weapon ?? '';
  if (weapon && TEAM_BY_WEAPON[weapon]) {
    return TEAM_BY_WEAPON[weapon];
  }

  if (matchesAgentType(skin)) {
    return determineAgentTeam(skin);
  }

  return slot?.teamHint ?? 'Both';
};

export default function LoadoutCookerPage() {
  const [skins, setSkins] = useState<SkinDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<LoadoutSlot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selections, setSelections] = useState<LoadoutSelections>({});
  const [activeTeam, setActiveTeam] = useState<Team>('CT');
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
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [loadoutName, setLoadoutName] = useState('');
  const [isSavingLoadout, setIsSavingLoadout] = useState(false);
  const [loadoutError, setLoadoutError] = useState<string | null>(null);

  const skinById = useMemo(() => {
    const map = new Map<number, SkinDto>();
    skins.forEach((skin) => map.set(skin.id, skin));
    return map;
  }, [skins]);

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

  const handleSaveLoadout = useCallback(async () => {
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
    } catch (err) {
      setLoadoutError(err instanceof Error ? err.message : 'Failed to save loadout.');
    } finally {
      setIsSavingLoadout(false);
    }
  }, [user?.id, buildLoadoutEntries, loadoutName]);

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

    setActiveSlot(null);
    setSearchTerm('');
    setExpandedWeapon(null);
  };

  const renderSlotCard = (slot: LoadoutSlot) => {
    const slotSelection = selections[slot.key];
    const teamKey = activeTeam === 'CT' ? 'ct' : 't';
    const fallbackKey = teamKey === 'ct' ? 't' : 'ct';
    const activeEntry = slotSelection?.[teamKey];
    const fallbackEntry = slotSelection?.[fallbackKey];
    const selectedEntry = activeEntry ?? fallbackEntry;
    const selectedSkin = selectedEntry?.skin;
    const selectedTeamLabel = activeEntry
      ? activeTeam
      : fallbackEntry
      ? fallbackKey === 'ct'
        ? 'CT'
        : 'T'
      : null;

    return (
      <button
        key={slot.key}
        onClick={() => setActiveSlot(slot)}
        className="group flex h-full flex-col rounded-2xl border border-gray-800 bg-gray-900/50 p-4 text-left transition hover:border-purple-400/80 hover:bg-gray-900"
      >
        <div className="flex grow flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{slot.label}</p>
              {slot.description && (
                <p className="text-xs text-gray-400">{slot.description}</p>
              )}
            </div>
            <svg
              className="h-5 w-5 text-purple-400 transition group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <div className="flex flex-1 items-center justify-center">
            {selectedSkin ? (
              <div className="relative flex h-32 w-full items-center justify-center rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-purple-900/10 p-3">
                {selectedSkin.imageUrl ? (
                  <img
                    src={selectedSkin.imageUrl}
                    alt={selectedSkin.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-purple-200">
                    No Image
                  </div>
                )}
              </div>
            ) : (
              <div className="grid h-24 w-full place-content-center rounded-xl border border-dashed border-gray-700 bg-gray-900/80 text-gray-600">
                <span className="text-sm">Select skin</span>
              </div>
            )}
          </div>

          {selectedSkin && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3">
              <p className="text-xs font-semibold text-purple-200 line-clamp-2">{selectedSkin.name}</p>
              <p className="text-xs text-gray-400">
                {selectedSkin.weapon ?? selectedSkin.type ?? 'Unknown'}
                {/* • {formatCurrency(Number(selectedSkin.defaultPrice ?? 0))} */}
              </p>
              {/* Assignment details removed per design */}
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderModal = () => {
    if (!activeSlot) return null;

    type DisplayEntry = {
      key: string;
      label: string;
      representative: SkinDto;
      variants: SkinDto[];
      grouped: boolean;
    };

    const groupedSlot = activeSlot.key === 'knife' || activeSlot.key === 'gloves';

    const teamSkins = groupedSlot
      ? filteredSlotSkins
      : activeTeam === 'CT'
      ? ctSkins
      : tSkins;
    let displayEntries: DisplayEntry[] = [];

    if (groupedSlot) {
      const variantMap = new Map<string, { label: string; variants: SkinDto[] }>();
      const defaultLabel = activeSlot.key === 'gloves' ? 'Gloves' : 'Knife';

      teamSkins.forEach((skin) => {
        const baseLabel = (skin.name ?? '').split('|')[0]?.trim() || skin.weapon || skin.name || defaultLabel;
        const baseKey = baseLabel.toLowerCase();

        if (!variantMap.has(baseKey)) {
          variantMap.set(baseKey, { label: baseLabel, variants: [] });
        }
        variantMap.get(baseKey)!.variants.push(skin);
      });

      displayEntries = Array.from(variantMap.entries())
        .map(([key, value]) => {
          const sortedVariants = [...value.variants].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
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

    const renderVariantButton = (variant: SkinDto) => {
      const team = determineTeamForSkin(variant, activeSlot);
      return (
        <button
          key={variant.id}
          onClick={() => handleSelectSkin(variant)}
          className="flex flex-col gap-2 rounded-2xl border border-gray-800 bg-gray-950/70 p-3 text-left transition hover:border-purple-400/60 hover:bg-gray-900"
        >
          <div className="relative h-32 w-full overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-900/10">
            {variant.imageUrl ? (
              <img
                src={variant.imageUrl}
                alt={variant.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-purple-200">
                No Image
              </div>
            )}
            {/* <span className="absolute bottom-2 right-2 rounded-full border border-purple-500/40 bg-black/70 px-2 py-0.5 text-[10px] text-purple-100">
              {formatCurrency(Number(variant.defaultPrice ?? 0))}
            </span> */}
          </div>
          <p className="text-sm font-semibold text-white line-clamp-2">{variant.name}</p>
        </button>
      );
    };

    const renderGroupedEntry = (entry: DisplayEntry) => {
      const representative = entry.representative;
      const team = determineTeamForSkin(representative, activeSlot);
      const isExpanded = expandedWeapon === entry.key;

      return (
        <div
          key={entry.key}
          className="rounded-3xl border border-purple-500/30 bg-gray-900/70 p-4 shadow-inner shadow-purple-900/20"
        >
          <button
            onClick={() => setExpandedWeapon((prev) => (prev === entry.key ? null : entry.key))}
            className="flex w-full items-center gap-4 text-left"
          >
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-500/20 to-purple-800/20">
              {representative.imageUrl ? (
                <img
                  src={representative.imageUrl}
                  alt={entry.label}
                  className="h-full w-full object-contain"
                />
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
                {/* <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-200">
                  Team: {team}
                </span> */}
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
      const team = determineTeamForSkin(skin, activeSlot);
      return (
        <button
          key={entry.key}
          onClick={() => handleSelectSkin(skin)}
          className="w-full rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-left transition hover:border-purple-400/60 hover:bg-gray-900"
        >
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-purple-800/20">
              {skin.imageUrl ? (
                <img
                  src={skin.imageUrl}
                  alt={skin.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-purple-200">
                  No Image
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{skin.name}</p>
                {/* <span className="text-xs text-purple-200">{formatCurrency(Number(skin.defaultPrice ?? 0))}</span> */}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                {/* <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-200">
                  Team: {team}
                </span> */}
                {skin.collection && <span>Collection: {skin.collection}</span>}
              </div>
            </div>
          </div>
        </button>
      );
    };

    const teamLabel = groupedSlot
      ? activeSlot.key === 'gloves'
        ? 'Glove Families'
        : 'Knife Families'
      : activeTeam === 'CT'
      ? 'CT Side'
      : 'T Side';
    const totalItems = displayEntries.length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-4xl rounded-3xl border border-purple-500 bg-gray-950/95 p-6 shadow-2xl shadow-purple-900/40">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Select skin for {activeSlot.label}</h3>
              <p className="text-sm text-gray-400">
                Choose a skin to add to your loadout. Items are grouped by team affiliation.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveSlot(null);
                setSearchTerm('');
                setExpandedWeapon(null);
              }}
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search skins..."
              className="w-full rounded-xl border border-purple-500/30 bg-gray-900/70 px-4 py-2 text-sm text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {groupedSlot ? (
                  (activeSlot.key === 'gloves' || activeSlot.key === 'knife') && (
                    <TeamIcon team="Both" />
                  )
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
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-purple-300/80">Loadout Lab</p>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Loadout Cooker</h1>
              <TeamIcon team={activeTeam} size="h-7 w-7" />
            </div>
            <p className="text-sm text-gray-400">
              Build your dream CT & T loadouts by mixing and matching skins from the entire catalog.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full border border-purple-500/40 bg-purple-500/10 p-1">
              {(['CT', 'T'] as Team[]).map((team) => (
                <button
                  key={team}
                  onClick={() => setActiveTeam(team)}
                  className={`px-4 py-1 text-sm font-semibold transition ${
                    activeTeam === team
                      ? 'rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                      : 'rounded-full text-purple-200 hover:bg-purple-500/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TeamIcon team={team} />
                    {team} Loadout
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={handleOpenSaveModal}
              className="rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 transition hover:bg-purple-500/20"
            >
              Save Loadout
            </button>
            <button
              onClick={handleEquipInventory}
              disabled={inventoryLoading || !user?.id}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                inventoryLoading || !user?.id
                  ? 'cursor-not-allowed border border-gray-800 bg-gray-900 text-gray-500'
                  : 'border border-gray-700 bg-gray-900 text-gray-200 hover:border-purple-400/40 hover:text-purple-200'
              }`}
            >
              {inventoryLoading ? 'Loading Inventory...' : 'Equip Your Inventory'}
            </button>
          </div>
        </header>

        {(inventoryError || equipFeedback) && (
          <div className="text-right text-xs">
            {inventoryError && <p className="text-red-400">{inventoryError}</p>}
            {equipFeedback && <p className="text-gray-400">{equipFeedback}</p>}
          </div>
        )}

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-gray-400">
            Loading skins...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {LOADOUT_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-purple-200">{section.title}</h2>
                  <span className="text-xs text-gray-500">{section.slots.length} slots</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.slots
                    .filter((slot) => {
                      if (!slot.teamHint || slot.teamHint === 'Both') return true;
                      return slot.teamHint === activeTeam;
                    })
                    .map((slot) => renderSlotCard(slot))}
                  {section.slots.every(
                    (slot) => slot.teamHint && slot.teamHint !== 'Both' && slot.teamHint !== activeTeam
                  ) && (
                    <p className="col-span-full rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-500">
                      No slots available for the {activeTeam} team in this section.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {isModalOpen && renderModal()}
      {currentChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-purple-500 bg-gray-950 p-6 shadow-2xl shadow-purple-900/40">
            <h3 className="text-lg font-semibold text-white">
              <span className="flex items-center gap-2">
                <TeamIcon team={currentChoice.team} />
                Select {currentChoice.slot.label} for {currentChoice.team} side
              </span>
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Choose which inventory item should be equipped on the {currentChoice.team} side.
            </p>
            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
              {currentChoice.options.map((option) => (
                <button
                  key={`${currentChoice.slot.key}-${currentChoice.team}-${option.inventoryId}`}
                  onClick={() => handleChoiceSelection(option.inventoryId)}
                  className="flex w-full items-center gap-3 rounded-xl border border-purple-500/30 bg-gray-900/60 p-3 text-left transition hover:border-purple-400 hover:bg-gray-900"
                >
                  {option.skin.imageUrl ? (
                    <img
                      src={option.skin.imageUrl}
                      alt={option.skin.name}
                      className="h-12 w-12 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-purple-500/30 bg-gray-900 text-xs text-purple-200">
                      No Image
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white line-clamp-2">
                      {option.skin.name}
                    </span>
                    {option.skin.collection && (
                      <span className="text-xs text-gray-400">{option.skin.collection}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={handleSkipChoice}
              className="mt-4 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition hover:border-purple-400/40 hover:text-purple-200"
            >
              Skip this slot for now
            </button>
          </div>
        </div>
      )}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-purple-500 bg-gray-950 p-6 shadow-2xl shadow-purple-900/40">
            <h3 className="text-lg font-semibold text-white">Save Loadout</h3>
            <p className="mt-2 text-sm text-gray-400">
              Give this loadout a friendly name so you can favorite it for later.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs uppercase tracking-wide text-purple-200">
                Loadout Name
              </label>
              <input
                value={loadoutName}
                onChange={(event) => setLoadoutName(event.target.value)}
                placeholder="e.g. CT Mirage Default"
                className="w-full rounded-xl border border-purple-500/40 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none"
              />
              {loadoutError && <p className="text-sm text-red-400">{loadoutError}</p>}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={handleCloseSaveModal}
                className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition hover:border-purple-400/40 hover:text-purple-200"
                disabled={isSavingLoadout}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLoadout}
                disabled={isSavingLoadout}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isSavingLoadout
                    ? 'cursor-not-allowed border border-purple-900 bg-purple-900 text-gray-400'
                    : 'border border-purple-500/60 bg-purple-500/20 text-purple-100 hover:border-purple-400/80 hover:bg-purple-500/30'
                }`}
              >
                {isSavingLoadout ? 'Saving...' : 'Save Loadout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


