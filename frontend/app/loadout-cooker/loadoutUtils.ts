import type { SkinDto } from '@/lib/api';
import type { LoadoutSection, Team, SkinImageSource } from './types';

export const TEAM_ICONS: Record<'CT' | 'T', string> = {
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

export const matchesKnifeType = (skin: SkinDto) => {
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

export const matchesGloveType = (skin: SkinDto) => {
  const lowerName = (skin.name ?? '').toLowerCase();
  const lowerWeapon = (skin.weapon ?? '').toLowerCase();
  const lowerType = (skin.type ?? '').toLowerCase();

  return (
    lowerType.includes('glove') ||
    lowerWeapon.includes('glove') ||
    lowerName.includes('glove')
  );
};

export const CT_AGENT_PATTERNS = [
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

export const T_AGENT_PATTERNS = [
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

export const classifyAgentSide = (skin: SkinDto): Team | null => {
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

export const matchesAgentType = (skin: SkinDto) =>
  (skin.type ?? '').toLowerCase().includes('agent') && classifyAgentSide(skin) !== null;

export const determineAgentTeam = (skin: SkinDto): Team => {
  const side = classifyAgentSide(skin);
  return side ?? 'Both';
};

export const TEAM_BY_WEAPON: Record<string, Team> = {
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

export const matchWeapon = (skin: SkinDto, weaponName: string) =>
  (skin.weapon ?? '').toLowerCase() === weaponName.toLowerCase();

export const determineTeamForSkin = (skin: SkinDto, slot?: { key: string; teamHint?: Team }): Team => {
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

export const LOADOUT_SECTIONS: LoadoutSection[] = [
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

const weaponFileMap: Record<string, string> = {
  'AK-47': 'CS2_AK-47_Inventory.png',
  AUG: 'CS2_AUG_Inventory.webp',
  AWP: 'CS2_AWP_Inventory.png',
  'CZ75-Auto': 'CS2_CZ75-Auto_Inventory.webp',
  'Desert Eagle': 'CS2_Desert_Eagle_Inventory.webp',
  'Dual Berettas': 'CS2_Dual_Berettas_Inventory.webp',
  FAMAS: 'CS2_FAMAS_Inventory.webp',
  'Five-SeveN': 'CS2_Five-SeveN_Inventory.webp',
  G3SG1: 'CS2_G3SG1_Inventory.webp',
  'Galil AR': 'CS2_Galil_AR_Inventory.webp',
  'Glock-18': 'CS2_Glock-18_Inventory.webp',
  'M4A1-S': 'CS2_M4A1-S_Inventory.png',
  M4A4: 'CS2_M4A4_Inventory.webp',
  M249: 'CS2_M249_Inventory.webp',
  'MAC-10': 'CS2_MAC-10_Inventory.webp',
  'MAG-7': 'CS2_MAG-7_Inventory.png',
  'MP5-SD': 'CS2_MP5-SD_Inventory.webp',
  MP7: 'CS2_MP7_Inventory.webp',
  MP9: 'CS2_MP9_Inventory.webp',
  Negev: 'CS2_Negev_Inventory.webp',
  Nova: 'CS2_Nova_Inventory.png',
  P90: 'CS2_P90_Inventory.png',
  P2000: 'CS2_P2000_Inventory.webp',
  P250: 'CS2_P250_Inventory.webp',
  'PP-Bizon': 'CS2_PP-Bizon_Inventory.webp',
  'R8 Revolver': 'CS2_R8_Revolver_Inventory.webp',
  'Sawed-Off': 'CS2_Sawed-Off_Inventory.webp',
  'SCAR-20': 'CS2_SCAR-20_Inventory.png',
  'SG 553': 'CS2_SG_553_Inventory.webp',
  'SSG 08': 'CS2_SSG_08_Inventory.webp',
  'Tec-9': 'CS2_Tec-9_Inventory.webp',
  'UMP-45': 'CS2_UMP-45_Inventory.webp',
  XM1014: 'CS2_XM1014_Inventory.png',
};

export const getFallbackImageForSkin = (skin: SkinImageSource) => {
  const basePath = '/photos/weapons';
  const weapon = skin.weapon ?? skin.type ?? '';
  const filename = weaponFileMap[weapon];
  if (filename) {
    return `${basePath}/${filename}`;
  }

  return skin.imageUrl ?? null;
};

