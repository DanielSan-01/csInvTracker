import type { SkinDto } from '@/lib/api';

type Team = 'CT' | 'T' | 'Both';

type DefaultSlotSkin = Pick<SkinDto, 'name' | 'weapon' | 'type' | 'imageUrl'>;

type SlotDefaultConfig = Partial<Record<Team, DefaultSlotSkin>>;

const PLACEHOLDER_COLORS: Record<Team, string> = {
  CT: '1E3A8A',
  T: '92400E',
  Both: '4C1D95',
};

const createPlaceholderImage = (label: string, team: Team) =>
  `https://via.placeholder.com/400x240/${PLACEHOLDER_COLORS[team]}/FFFFFF?text=${encodeURIComponent(label)}`;

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
      imageUrl: createPlaceholderImage('Glock-18', 'T'),
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
      imageUrl: createPlaceholderImage('P2000', 'CT'),
    },
  },
  p250: {
    Both: {
      name: 'Default P250',
      weapon: 'P250',
      type: 'Pistol',
      imageUrl: createPlaceholderImage('P250', 'Both'),
    },
  },
  'dual-berettas': {
    Both: {
      name: 'Default Dual Berettas',
      weapon: 'Dual Berettas',
      type: 'Pistol',
      imageUrl: createPlaceholderImage('Dual Berettas', 'Both'),
    },
  },
  'five-seven': {
    CT: {
      name: 'Default Five-SeveN',
      weapon: 'Five-SeveN',
      type: 'Pistol',
      imageUrl: createPlaceholderImage('Five-SeveN', 'CT'),
    },
  },
  'tec-9': {
    T: {
      name: 'Default Tec-9',
      weapon: 'Tec-9',
      type: 'Pistol',
      imageUrl: createPlaceholderImage('Tec-9', 'T'),
    },
  },
  'cz75-auto': {
    Both: {
      name: 'Default CZ75-Auto',
      weapon: 'CZ75-Auto',
      type: 'Pistol',
      imageUrl: createPlaceholderImage('CZ75-Auto', 'Both'),
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
      imageUrl: createPlaceholderImage('MP9', 'CT'),
    },
    T: {
      name: 'Default MAC-10',
      weapon: 'MAC-10',
      type: 'SMG',
      imageUrl: createPlaceholderImage('MAC-10', 'T'),
    },
  },
  mp5: {
    CT: {
      name: 'Default MP5-SD',
      weapon: 'MP5-SD',
      type: 'SMG',
      imageUrl: createPlaceholderImage('MP5-SD', 'CT'),
    },
    T: {
      name: 'Default MP7',
      weapon: 'MP7',
      type: 'SMG',
      imageUrl: createPlaceholderImage('MP7', 'T'),
    },
  },
  'ump-45': {
    Both: {
      name: 'Default UMP-45',
      weapon: 'UMP-45',
      type: 'SMG',
      imageUrl: createPlaceholderImage('UMP-45', 'Both'),
    },
  },
  p90: {
    Both: {
      name: 'Default P90',
      weapon: 'P90',
      type: 'SMG',
      imageUrl: createPlaceholderImage('P90', 'Both'),
    },
  },
  'pp-bizon': {
    Both: {
      name: 'Default PP-Bizon',
      weapon: 'PP-Bizon',
      type: 'SMG',
      imageUrl: createPlaceholderImage('PP-Bizon', 'Both'),
    },
  },
  nova: {
    CT: {
      name: 'Default Nova',
      weapon: 'Nova',
      type: 'Shotgun',
      imageUrl: createPlaceholderImage('Nova', 'CT'),
    },
    T: {
      name: 'Default XM1014',
      weapon: 'XM1014',
      type: 'Shotgun',
      imageUrl: createPlaceholderImage('XM1014', 'T'),
    },
  },
  'mag-7': {
    CT: {
      name: 'Default MAG-7',
      weapon: 'MAG-7',
      type: 'Shotgun',
      imageUrl: createPlaceholderImage('MAG-7', 'CT'),
    },
    T: {
      name: 'Default Sawed-Off',
      weapon: 'Sawed-Off',
      type: 'Shotgun',
      imageUrl: createPlaceholderImage('Sawed-Off', 'T'),
    },
  },
  'ak-47': {
    T: {
      name: 'Default AK-47',
      weapon: 'AK-47',
      type: 'Rifle',
      imageUrl: createPlaceholderImage('AK-47', 'T'),
    },
  },
  m4a4: {
    CT: {
      name: 'Default M4A4',
      weapon: 'M4A4',
      type: 'Rifle',
      imageUrl: createPlaceholderImage('M4A4', 'CT'),
    },
  },
  'm4a1-s': {
    CT: {
      name: 'Default M4A1-S',
      weapon: 'M4A1-S',
      type: 'Rifle',
      imageUrl: createPlaceholderImage('M4A1-S', 'CT'),
    },
  },
  famas: {
    CT: {
      name: 'Default FAMAS',
      weapon: 'FAMAS',
      type: 'Rifle',
      imageUrl: createPlaceholderImage('FAMAS', 'CT'),
    },
  },
  'galil-ar': {
    T: {
      name: 'Default Galil AR',
      weapon: 'Galil AR',
      type: 'Rifle',
      imageUrl: createPlaceholderImage('Galil AR', 'T'),
    },
  },
  awp: {
    Both: {
      name: 'Default AWP',
      weapon: 'AWP',
      type: 'Sniper Rifle',
      imageUrl: createPlaceholderImage('AWP', 'Both'),
    },
  },
  'ssg-08': {
    Both: {
      name: 'Default SSG 08',
      weapon: 'SSG 08',
      type: 'Sniper Rifle',
      imageUrl: createPlaceholderImage('SSG 08', 'Both'),
    },
  },
  'scar-g3sg1': {
    CT: {
      name: 'Default SCAR-20',
      weapon: 'SCAR-20',
      type: 'Sniper Rifle',
      imageUrl: createPlaceholderImage('SCAR-20', 'CT'),
    },
    T: {
      name: 'Default G3SG1',
      weapon: 'G3SG1',
      type: 'Sniper Rifle',
      imageUrl: createPlaceholderImage('G3SG1', 'T'),
    },
  },
  'm249-negev': {
    CT: {
      name: 'Default M249',
      weapon: 'M249',
      type: 'Machine Gun',
      imageUrl: createPlaceholderImage('M249', 'CT'),
    },
    T: {
      name: 'Default Negev',
      weapon: 'Negev',
      type: 'Machine Gun',
      imageUrl: createPlaceholderImage('Negev', 'T'),
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



