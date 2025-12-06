import type { SkinDto } from '@/lib/api';

type Team = 'CT' | 'T' | 'Both';

type DefaultSlotSkin = Pick<SkinDto, 'name' | 'weapon' | 'type' | 'imageUrl'>;

type SlotDefaultConfig = Partial<Record<Team, DefaultSlotSkin>>;

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

const getWeaponImage = (weapon: string): string => {
  const filename = weaponFileMap[weapon];
  if (filename) {
    return `/photos/weapons/${filename}`;
  }
  // Fallback to placeholder if weapon not found
  return `https://via.placeholder.com/400x240/374151/FFFFFF?text=${encodeURIComponent(weapon)}`;
};

const DEFAULT_SLOT_SKINS: Record<string, SlotDefaultConfig> = {
  knife: {
    Both: {
      name: 'Vanilla Knife',
      weapon: 'Knife',
      type: 'Knife',
      imageUrl: '/photos/weapons/Knife_cs2_bothSides.webp',
    },
  },
  gloves: {
    Both: {
      name: 'Default Gloves',
      weapon: 'Gloves',
      type: 'Gloves',
      imageUrl: '/photos/weapons/default_gloves.webp',
    },
  },
  agent: {
    CT: {
      name: 'Seal Team 6 Soldier',
      weapon: 'Agent',
      type: 'Agent',
      imageUrl: '/photos/weapons/cs_default_agents.webp',
    },
    T: {
      name: 'Dragomir',
      weapon: 'Agent',
      type: 'Agent',
      imageUrl: '/photos/weapons/tside_agents.webp',
    },
  },
  'glock-18': {
    T: {
      name: 'Default Glock-18',
      weapon: 'Glock-18',
      type: 'Pistol',
      imageUrl: getWeaponImage('Glock-18'),
    },
  },
  'usp-s': {
    CT: {
      name: 'Default USP-S',
      weapon: 'USP-S',
      type: 'Pistol',
      imageUrl: '/photos/weapons/CS2_USP-S_Inventory.webp',
    },
  },
  p2000: {
    CT: {
      name: 'Default P2000',
      weapon: 'P2000',
      type: 'Pistol',
      imageUrl: getWeaponImage('P2000'),
    },
  },
  p250: {
    Both: {
      name: 'Default P250',
      weapon: 'P250',
      type: 'Pistol',
      imageUrl: getWeaponImage('P250'),
    },
  },
  'dual-berettas': {
    Both: {
      name: 'Default Dual Berettas',
      weapon: 'Dual Berettas',
      type: 'Pistol',
      imageUrl: getWeaponImage('Dual Berettas'),
    },
  },
  'five-seven': {
    CT: {
      name: 'Default Five-SeveN',
      weapon: 'Five-SeveN',
      type: 'Pistol',
      imageUrl: getWeaponImage('Five-SeveN'),
    },
  },
  'tec-9': {
    T: {
      name: 'Default Tec-9',
      weapon: 'Tec-9',
      type: 'Pistol',
      imageUrl: getWeaponImage('Tec-9'),
    },
  },
  'cz75-auto': {
    Both: {
      name: 'Default CZ75-Auto',
      weapon: 'CZ75-Auto',
      type: 'Pistol',
      imageUrl: getWeaponImage('CZ75-Auto'),
    },
  },
  'desert-eagle': {
    Both: {
      name: 'Default Desert Eagle',
      weapon: 'Desert Eagle',
      type: 'Pistol',
      imageUrl: '/photos/weapons/CS2_Desert_Eagle_Inventory.webp',
    },
  },
  mp9: {
    CT: {
      name: 'Default MP9',
      weapon: 'MP9',
      type: 'SMG',
      imageUrl: getWeaponImage('MP9'),
    },
    T: {
      name: 'Default MAC-10',
      weapon: 'MAC-10',
      type: 'SMG',
      imageUrl: getWeaponImage('MAC-10'),
    },
  },
  mp5: {
    CT: {
      name: 'Default MP5-SD',
      weapon: 'MP5-SD',
      type: 'SMG',
      imageUrl: getWeaponImage('MP5-SD'),
    },
    T: {
      name: 'Default MP7',
      weapon: 'MP7',
      type: 'SMG',
      imageUrl: getWeaponImage('MP7'),
    },
  },
  'ump-45': {
    Both: {
      name: 'Default UMP-45',
      weapon: 'UMP-45',
      type: 'SMG',
      imageUrl: getWeaponImage('UMP-45'),
    },
  },
  p90: {
    Both: {
      name: 'Default P90',
      weapon: 'P90',
      type: 'SMG',
      imageUrl: getWeaponImage('P90'),
    },
  },
  'pp-bizon': {
    Both: {
      name: 'Default PP-Bizon',
      weapon: 'PP-Bizon',
      type: 'SMG',
      imageUrl: getWeaponImage('PP-Bizon'),
    },
  },
  nova: {
    CT: {
      name: 'Default Nova',
      weapon: 'Nova',
      type: 'Shotgun',
      imageUrl: getWeaponImage('Nova'),
    },
    T: {
      name: 'Default XM1014',
      weapon: 'XM1014',
      type: 'Shotgun',
      imageUrl: '/photos/weapons/CS2_XM1014_Inventory.png',
    },
  },
  'mag-7': {
    CT: {
      name: 'Default MAG-7',
      weapon: 'MAG-7',
      type: 'Shotgun',
      imageUrl: getWeaponImage('MAG-7'),
    },
    T: {
      name: 'Default Sawed-Off',
      weapon: 'Sawed-Off',
      type: 'Shotgun',
      imageUrl: getWeaponImage('Sawed-Off'),
    },
  },
  'ak-47': {
    T: {
      name: 'Default AK-47',
      weapon: 'AK-47',
      type: 'Rifle',
      imageUrl: getWeaponImage('AK-47'),
    },
  },
  m4a4: {
    CT: {
      name: 'Default M4A4',
      weapon: 'M4A4',
      type: 'Rifle',
      imageUrl: getWeaponImage('M4A4'),
    },
  },
  'm4a1-s': {
    CT: {
      name: 'Default M4A1-S',
      weapon: 'M4A1-S',
      type: 'Rifle',
      imageUrl: getWeaponImage('M4A1-S'),
    },
  },
  famas: {
    CT: {
      name: 'Default FAMAS',
      weapon: 'FAMAS',
      type: 'Rifle',
      imageUrl: getWeaponImage('FAMAS'),
    },
  },
  'galil-ar': {
    T: {
      name: 'Default Galil AR',
      weapon: 'Galil AR',
      type: 'Rifle',
      imageUrl: getWeaponImage('Galil AR'),
    },
  },
  awp: {
    Both: {
      name: 'Default AWP',
      weapon: 'AWP',
      type: 'Sniper Rifle',
      imageUrl: getWeaponImage('AWP'),
    },
  },
  'ssg-08': {
    Both: {
      name: 'Default SSG 08',
      weapon: 'SSG 08',
      type: 'Sniper Rifle',
      imageUrl: getWeaponImage('SSG 08'),
    },
  },
  'scar-g3sg1': {
    CT: {
      name: 'Default SCAR-20',
      weapon: 'SCAR-20',
      type: 'Sniper Rifle',
      imageUrl: getWeaponImage('SCAR-20'),
    },
    T: {
      name: 'Default G3SG1',
      weapon: 'G3SG1',
      type: 'Sniper Rifle',
      imageUrl: getWeaponImage('G3SG1'),
    },
  },
  'm249-negev': {
    CT: {
      name: 'Default M249',
      weapon: 'M249',
      type: 'Machine Gun',
      imageUrl: getWeaponImage('M249'),
    },
    T: {
      name: 'Default Negev',
      weapon: 'Negev',
      type: 'Machine Gun',
      imageUrl: getWeaponImage('Negev'),
    },
  },
};

export const getDefaultSlotSkin = (slotKey: string, team: 'CT' | 'T'): DefaultSlotSkin | null => {
  const entry = DEFAULT_SLOT_SKINS[slotKey];
  if (!entry) {
    return null;
  }

  return entry[team] ?? entry.Both ?? null;
};



