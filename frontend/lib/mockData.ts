// Mock data for CS Inventory items

export type ItemType =
  | 'Gloves'
  | 'Knife'
  | 'Rifle'
  | 'Pistol'
  | 'SMG'
  | 'Sniper Rifle'
  | 'Shotgun'
  | 'Machine Gun'
  | 'Agent'
  | 'Equipment'
  | 'Collectible'
  | 'Sticker'
  | 'Graffiti'
  | 'Patch'
  | 'Music Kit'
  | 'Case'
  | 'Key'
  | 'Keychain'
  | 'Tool'
  | 'Other';

export interface CSSticker {
  id?: number;
  name: string;
  price?: number;
  slot?: number;
  imageUrl?: string;
}

export interface CSItem {
  id: string;
  skinId?: number;
  name: string;
  rarity: Rarity;
  float: number;
  exterior: Exterior;
  paintSeed?: number;
  paintIndex?: number;
  price: number;
  cost?: number;
  imageUrl: string;
  type: ItemType;
   collection?: string;
   weapon?: string;
  tradeProtected?: boolean;
  tradableAfter?: Date;
  dopplerPhase?: string;
  dopplerPhaseImageUrl?: string;
  stickers?: CSSticker[];
}

export type Rarity = 
  | 'Consumer Grade'
  | 'Industrial Grade'
  | 'Mil-Spec'
  | 'Restricted'
  | 'Classified'
  | 'Covert'
  | 'Extraordinary'
  | 'Contraband';

export type Exterior = 
  | 'Factory New'
  | 'Minimal Wear'
  | 'Field-Tested'
  | 'Well-Worn'
  | 'Battle-Scarred';

// Rarity color mapping
export const rarityColors: Record<Rarity, string> = {
  'Consumer Grade': 'bg-gray-500',
  'Industrial Grade': 'bg-blue-500',
  'Mil-Spec': 'bg-blue-600',
  'Restricted': 'bg-purple-500',
  'Classified': 'bg-pink-500',
  'Covert': 'bg-red-500',
  'Extraordinary': 'bg-yellow-500',
  'Contraband': 'bg-orange-500',
};

// Rarity border colors (for condition badges)
export const rarityBorderColors: Record<Rarity, string> = {
  'Consumer Grade': 'border-gray-500',
  'Industrial Grade': 'border-blue-500',
  'Mil-Spec': 'border-blue-600',
  'Restricted': 'border-purple-500',
  'Classified': 'border-pink-500',
  'Covert': 'border-red-500',
  'Extraordinary': 'border-yellow-500',
  'Contraband': 'border-orange-500',
};

// Rarity gradient colors for image backgrounds (very subtle vertical gradient)
export const rarityGradients: Record<Rarity, string> = {
  'Consumer Grade': 'from-gray-800/20 to-gray-900/30',
  'Industrial Grade': 'from-blue-900/20 to-blue-950/30',
  'Mil-Spec': 'from-blue-950/20 to-blue-950/30',
  'Restricted': 'from-purple-950/20 to-purple-950/30',
  'Classified': 'from-pink-950/20 to-pink-950/30',
  'Covert': 'from-red-950/20 to-red-950/30',
  'Extraordinary': 'from-yellow-950/20 to-yellow-950/30',
  'Contraband': 'from-orange-950/20 to-orange-950/30',
};

// Exterior abbreviation mapping
export const exteriorAbbr: Record<Exterior, string> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
};

// Helper function to determine exterior from float
function getExteriorFromFloat(float: number): Exterior {
  if (float < 0.07) return 'Factory New';
  if (float < 0.15) return 'Minimal Wear';
  if (float < 0.38) return 'Field-Tested';
  if (float < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
}

// Helper function to generate placeholder image URL
function getPlaceholderImage(itemName: string, rarity: Rarity): string {
  const rarityColorMap: Record<Rarity, string> = {
    'Consumer Grade': '6B7280',
    'Industrial Grade': '3B82F6',
    'Mil-Spec': '2563EB',
    'Restricted': 'A855F7',
    'Classified': 'EC4899',
    'Covert': 'DC2626',
    'Extraordinary': 'EAB308',
    'Contraband': 'F97316',
  };
  const color = rarityColorMap[rarity];
  return `https://via.placeholder.com/300x200/${color}/FFFFFF?text=${encodeURIComponent(itemName)}`;
} 

// Mock inventory data
export const mockItems: CSItem[] = [
  // Gloves (Extraordinary)
  {
    id: '1',
    name: 'Sport Gloves | Pandora\'s Box',
    rarity: 'Extraordinary',
    float: 0.4619,
    exterior: getExteriorFromFloat(0.4619),
    price: 4500,
    cost: 3232.66,
    imageUrl: 'https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Sport+Gloves+Pandora',
    type: 'Gloves',
  },
  {
    id: '2',
    name: 'Sport Gloves | Nocts',
    rarity: 'Extraordinary',
    float: 0.565,
    exterior: getExteriorFromFloat(0.565),
    price: 680,
    cost: 429,
    imageUrl: 'https://community.fastly.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Tk5UvzWCL2kpn2-DFk_OKherB0H_qSCXKR09F-teB_Vmfjwkh_smuAzdasdniWaVNzAsYmQuYJ5hTsk4KxP-PhtAGI2opFzin_kGoXufyYXYCg/330x192?allow_animated=1',
    type: 'Gloves',
  },
  {
    id: '3',
    name: 'Moto Gloves | Spearmint',
    rarity: 'Extraordinary',
    float: 0.61,
    exterior: getExteriorFromFloat(0.61),
    price: 700,
    cost: 435,
    imageUrl: 'https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Moto+Gloves+Spearmint',
    type: 'Gloves',
  },
  {
    id: '4',
    name: 'Specialist Gloves | Foundation',
    rarity: 'Extraordinary',
    float: 0.5,
    exterior: getExteriorFromFloat(0.5),
    price: 290,
    cost: 150,
    imageUrl: 'https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Specialist+Gloves+Foundation',
    type: 'Gloves',
  },
  
  // Knives (Extraordinary)
  {
    id: '5',
    name: 'Butterfly Knife | Doppler (Phase 4)',
    rarity: 'Extraordinary',
    float: 0.01,
    exterior: getExteriorFromFloat(0.01),
    price: 3500,
    cost: 4522,
    imageUrl: 'https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Butterfly+Doppler',
    type: 'Knife',
  },
  {
    id: '6',
    name: 'Karambit | Tiger Tooth',
    rarity: 'Extraordinary',
    float: 0.009,
    exterior: getExteriorFromFloat(0.009),
    price: 1500,
    cost: 939.97,
    imageUrl: 'https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Karambit+Tiger+Tooth',
    type: 'Knife',
  },
  {
    id: '7',
    name: 'Butterfly Knife | Black Laminate',
    rarity: 'Extraordinary',
    float: 0.9,
    exterior: getExteriorFromFloat(0.9),
    price: 800,
    cost: 655,
    imageUrl: 'https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Butterfly+Black+Laminate',
    type: 'Knife',
  },
  {
    id: '8',
    name: 'Skeleton Knife | Urban Masked',
    rarity: 'Extraordinary',
    float: 0.09,
    exterior: getExteriorFromFloat(0.09),
    price: 250,
    cost: 173,
    imageUrl: 'https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Skeleton+Urban+Masked',
    type: 'Knife',
  },
  
  // Agents (Restricted)
  {
    id: '9',
    name: 'Vypa Sista of the Revolution | Guerrilla Warfare',
    rarity: 'Restricted',
    float: 0.5,
    exterior: getExteriorFromFloat(0.5),
    price: 80,
    cost: 55,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Vypa+Sista',
    type: 'Agent',
  },
  {
    id: '10',
    name: 'Number K | The Professionals',
    rarity: 'Restricted',
    float: 0.5,
    exterior: getExteriorFromFloat(0.5),
    price: 70,
    cost: 50,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Number+K',
    type: 'Agent',
  },
  {
    id: '11',
    name: 'Lt. Commander Ricksaw | NSWC SEAL',
    rarity: 'Restricted',
    float: 0.5,
    exterior: getExteriorFromFloat(0.5),
    price: 20,
    cost: 17,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Ricksaw',
    type: 'Agent',
  },
  {
    id: '12',
    name: 'Michael Syfers | FBI Sniper',
    rarity: 'Restricted',
    float: 0.5,
    exterior: getExteriorFromFloat(0.5),
    price: 21,
    cost: 17.37,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Syfers',
    type: 'Agent',
  },
  
  // Coverts
  {
    id: '13',
    name: 'AK-47 | Fire Serpent',
    rarity: 'Covert',
    float: 0.2216,
    exterior: getExteriorFromFloat(0.2216),
    price: 1049,
    cost: 945,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AK-47+Fire+Serpent',
    type: 'Rifle',
  },
  {
    id: '14',
    name: 'MAC-10 | Neon Rider',
    rarity: 'Covert',
    float: 0.1,
    exterior: getExteriorFromFloat(0.1),
    price: 115,
    cost: 9.65,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=MAC-10+Neon+Rider',
    type: 'SMG',
  },
  {
    id: '15',
    name: 'M4A4 | X-Ray',
    rarity: 'Covert',
    float: 0.8,
    exterior: getExteriorFromFloat(0.8),
    price: 100,
    cost: 17,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=M4A4+X-Ray',
    type: 'Rifle',
  },
  {
    id: '16',
    name: 'AWP | Printstream',
    rarity: 'Covert',
    float: 0.25,
    exterior: getExteriorFromFloat(0.25),
    price: 53,
    cost: 53,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AWP+Printstream',
    type: 'Sniper Rifle',
  },
  {
    id: '17',
    name: 'USP-S | Printstream',
    rarity: 'Covert',
    float: 0.28,
    exterior: getExteriorFromFloat(0.28),
    price: 33,
    cost: 33,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=USP-S+Printstream',
    type: 'Pistol',
  },
  {
    id: '18',
    name: 'Desert Eagle | Printstream',
    rarity: 'Covert',
    float: 0.21,
    exterior: getExteriorFromFloat(0.21),
    price: 30,
    cost: 30,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Desert+Eagle+Printstream',
    type: 'Pistol',
  },
  {
    id: '19',
    name: 'Glock-18 | Gold Toof',
    rarity: 'Covert',
    float: 0.2062,
    exterior: getExteriorFromFloat(0.2062),
    price: 16,
    cost: 30,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Glock+Gold+Toof',
    type: 'Pistol',
  },
  {
    id: '20',
    name: 'AK-47 | Head Shot',
    rarity: 'Covert',
    float: 0.3113,
    exterior: getExteriorFromFloat(0.3113),
    price: 33,
    cost: 5,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AK-47+Head+Shot',
    type: 'Rifle',
  },
  
  // Weapons (Various rarities)
  {
    id: '21',
    name: 'Kumicho Dragon',
    rarity: 'Classified',
    float: 0.036,
    exterior: getExteriorFromFloat(0.036),
    price: 80,
    cost: 56,
    imageUrl: 'https://via.placeholder.com/300x200/EC4899/FFFFFF?text=Kumicho+Dragon',
    type: 'Collectible',
  },
  {
    id: '22',
    name: 'AK-47 | Midnight Laminate',
    rarity: 'Classified',
    float: 0.046,
    exterior: getExteriorFromFloat(0.046),
    price: 70,
    cost: 75,
    imageUrl: 'https://via.placeholder.com/300x200/EC4899/FFFFFF?text=AK-47+Midnight',
    type: 'Rifle',
  },
  {
    id: '23',
    name: 'Souvenir UMP-45 | Fade 96%',
    rarity: 'Classified',
    float: 0.3,
    exterior: getExteriorFromFloat(0.3),
    price: 65,
    cost: 46,
    imageUrl: 'https://via.placeholder.com/300x200/EC4899/FFFFFF?text=UMP-45+Fade',
    type: 'SMG',
  },
  {
    id: '24',
    name: 'M4A1-S | Black Lotus',
    rarity: 'Classified',
    float: 0.06,
    exterior: getExteriorFromFloat(0.06),
    price: 0,
    cost: 0,
    imageUrl: 'https://via.placeholder.com/300x200/EC4899/FFFFFF?text=M4A1-S+Black+Lotus',
    type: 'Rifle',
  },
  {
    id: '25',
    name: 'USP-S | Alpine Bluegem P69',
    rarity: 'Restricted',
    float: 0.06,
    exterior: getExteriorFromFloat(0.06),
    price: 10,
    cost: 9,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=USP+Alpine',
    type: 'Pistol',
  },
  {
    id: '26',
    name: 'Glock-18 | Mirror Mosaic',
    rarity: 'Restricted',
    float: 0.114,
    exterior: getExteriorFromFloat(0.114),
    price: 20,
    cost: 20,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Glock+Mirror',
    type: 'Pistol',
  },
  {
    id: '27',
    name: 'Glock-18 | Shinobu',
    rarity: 'Restricted',
    float: 0.0976,
    exterior: getExteriorFromFloat(0.0976),
    price: 9,
    cost: 10,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Glock+Shinobu',
    type: 'Pistol',
  },
  {
    id: '28',
    name: 'StatTrak™ Tec-9 | Sandstorm Purple Gem',
    rarity: 'Restricted',
    float: 0.2816,
    exterior: getExteriorFromFloat(0.2816),
    price: 5,
    cost: 1,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Tec-9+Sandstorm',
    type: 'Pistol',
  },
  {
    id: '29',
    name: 'MP7 | Fade 99%',
    rarity: 'Restricted',
    float: 0.14615,
    exterior: getExteriorFromFloat(0.14615),
    price: 3,
    cost: 5,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=MP7+Fade',
    type: 'SMG',
  },
  {
    id: '30',
    name: 'Zeus x27 | Olympus',
    rarity: 'Restricted',
    float: 0.2498,
    exterior: getExteriorFromFloat(0.2498),
    price: 3,
    cost: 5,
    imageUrl: 'https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Zeus+Olympus',
    type: 'Equipment',
  },
  {
    id: '31',
    name: 'P250 | X-Ray',
    rarity: 'Mil-Spec',
    float: 0.0245,
    exterior: getExteriorFromFloat(0.0245),
    price: 0.5,
    cost: 0.5,
    imageUrl: 'https://via.placeholder.com/300x200/2563EB/FFFFFF?text=P250+X-Ray',
    type: 'Pistol',
  },
  {
    id: '32',
    name: 'Glock-18 | Moonrise',
    rarity: 'Mil-Spec',
    float: 0.08,
    exterior: getExteriorFromFloat(0.08),
    price: 1,
    cost: 1,
    imageUrl: 'https://via.placeholder.com/300x200/2563EB/FFFFFF?text=Glock+Moonrise',
    type: 'Pistol',
  },
  {
    id: '33',
    name: 'StatTrak™ MP9 | Black Sand',
    rarity: 'Mil-Spec',
    float: 0.02809,
    exterior: getExteriorFromFloat(0.02809),
    price: 2,
    cost: 2,
    imageUrl: 'https://via.placeholder.com/300x200/2563EB/FFFFFF?text=MP9+Black+Sand',
    type: 'SMG',
  },
  {
    id: '34',
    name: 'StatTrak™ P90 | Elite Build',
    rarity: 'Mil-Spec',
    float: 0.0961,
    exterior: getExteriorFromFloat(0.0961),
    price: 1,
    cost: 1,
    imageUrl: 'https://via.placeholder.com/300x200/2563EB/FFFFFF?text=P90+Elite',
    type: 'SMG',
  },
];

// Helper function to get float color based on value
export function getFloatColor(float: number): string {
  if (float < 0.07) return 'bg-green-500'; // Factory New
  if (float < 0.15) return 'bg-lime-500'; // Minimal Wear
  if (float < 0.38) return 'bg-yellow-500'; // Field-Tested
  if (float < 0.45) return 'bg-orange-500'; // Well-Worn
  return 'bg-red-500'; // Battle-Scarred
}

// Helper function to format price
export function formatPrice(price: number): string {
  // Format values over 10 million as "10 mil" to fit in UI boxes
  if (price >= 10_000_000) {
    const millions = price / 1_000_000;
    return `$${millions.toFixed(1)} mil`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

// Helper function to format float
export function formatFloat(float: number, precision: number = 3): string {
  return float.toFixed(precision);
}

// Helper function to calculate profit
export function calculateProfit(price: number, cost?: number): number | undefined {
  if (cost === undefined) return undefined;
  return price - cost;
}

// Helper function to calculate profit percentage
export function calculateProfitPercentage(price: number, cost?: number): number | undefined {
  if (cost === undefined || cost === 0) return undefined;
  return ((price - cost) / cost) * 100;
}

