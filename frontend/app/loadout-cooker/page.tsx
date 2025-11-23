'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SkinDto } from '@/lib/api';
import { skinsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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

type LoadoutSelections = Record<string, SkinDto | undefined>;

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
  const weapon = skin.weapon ?? '';
  if (weapon && TEAM_BY_WEAPON[weapon]) {
    return TEAM_BY_WEAPON[weapon];
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
    setSelections((prev) => ({
      ...prev,
      [activeSlot.key]: skin,
    }));
    setActiveSlot(null);
    setSearchTerm('');
    setExpandedWeapon(null);
  };

  const renderSlotCard = (slot: LoadoutSlot) => {
    const selectedSkin = selections[slot.key];
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
            <div className="grid h-24 w-full place-content-center rounded-xl border border-dashed border-gray-700 bg-gray-900/80 text-gray-600">
              <span className="text-sm">Select skin</span>
            </div>
          </div>

          {selectedSkin && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3">
              <p className="text-xs font-semibold text-purple-200 line-clamp-2">{selectedSkin.name}</p>
              <p className="text-xs text-gray-400">
                {selectedSkin.weapon ?? selectedSkin.type ?? 'Unknown'} •{' '}
                {formatCurrency(Number(selectedSkin.defaultPrice ?? 0))}
              </p>
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
            <span className="absolute bottom-2 right-2 rounded-full border border-purple-500/40 bg-black/70 px-2 py-0.5 text-[10px] text-purple-100">
              {formatCurrency(Number(variant.defaultPrice ?? 0))}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white line-clamp-2">{variant.name}</p>
            <p className="text-xs text-gray-400">
              Team: <span className="text-purple-300">{team}</span>
            </p>
          </div>
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
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-200">
                  Team: {team}
                </span>
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
                <span className="text-xs text-purple-200">{formatCurrency(Number(skin.defaultPrice ?? 0))}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-200">
                  Team: {team}
                </span>
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
              <h4 className="text-sm font-semibold text-purple-200">{teamLabel}</h4>
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
            <h1 className="text-3xl font-bold text-white">Loadout Cooker</h1>
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
                  {team} Loadout
                </button>
              ))}
            </div>
            <button className="rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 transition hover:bg-purple-500/20">
              Generate Suggestions
            </button>
            <button className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-purple-400/40 hover:text-purple-200">
              Equip In-Game
            </button>
          </div>
        </header>

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
    </div>
  );
}


