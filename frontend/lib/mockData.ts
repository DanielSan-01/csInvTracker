// Mock data for CS Inventory items

export interface CSItem {
  id: string;
  name: string;
  rarity: Rarity;
  float: number;
  exterior: Exterior;
  paintSeed?: number;
  price: number;
  imageUrl: string;
  game: string;
  tradeProtected?: boolean;
  tradableAfter?: Date;
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

// Rarity border colors
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

// Exterior abbreviation mapping
export const exteriorAbbr: Record<Exterior, string> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
};

// Mock inventory data
export const mockItems: CSItem[] = [
  {
    id: '1',
    name: 'Sport Gloves | Nocts',
    rarity: 'Extraordinary',
    float: 0.56497824192047,
    exterior: 'Battle-Scarred',
    paintSeed: 396,
    price: 881.86,
    imageUrl: 'https://via.placeholder.com/300x200/4C1D95/FFFFFF?text=Sport+Gloves+Nocts',
    game: 'Counter-Strike 2',
    tradeProtected: true,
    tradableAfter: new Date('2025-11-12T09:00:00'),
  },
  {
    id: '2',
    name: 'AK-47 | Redline',
    rarity: 'Classified',
    float: 0.114523,
    exterior: 'Field-Tested',
    paintSeed: 123,
    price: 27.39,
    imageUrl: 'https://via.placeholder.com/300x200/E91E63/FFFFFF?text=AK-47+Redline',
    game: 'Counter-Strike 2',
    tradeProtected: false,
  },
  {
    id: '3',
    name: 'AWP | Dragon Lore',
    rarity: 'Covert',
    float: 0.063421,
    exterior: 'Factory New',
    paintSeed: 789,
    price: 2450.00,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AWP+Dragon+Lore',
    game: 'Counter-Strike 2',
    tradeProtected: true,
  },
  {
    id: '4',
    name: 'M4A4 | Howl',
    rarity: 'Contraband',
    float: 0.089234,
    exterior: 'Minimal Wear',
    paintSeed: 456,
    price: 3200.00,
    imageUrl: 'https://via.placeholder.com/300x200/F97316/FFFFFF?text=M4A4+Howl',
    game: 'Counter-Strike 2',
    tradeProtected: false,
  },
  {
    id: '5',
    name: 'Karambit | Fade',
    rarity: 'Extraordinary',
    float: 0.012345,
    exterior: 'Factory New',
    paintSeed: 234,
    price: 1850.50,
    imageUrl: 'https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Karambit+Fade',
    game: 'Counter-Strike 2',
    tradeProtected: true,
  },
  {
    id: '6',
    name: 'Glock-18 | Fade',
    rarity: 'Covert',
    float: 0.001234,
    exterior: 'Factory New',
    paintSeed: 567,
    price: 125.75,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Glock-18+Fade',
    game: 'Counter-Strike 2',
    tradeProtected: false,
  },
  {
    id: '7',
    name: 'USP-S | Kill Confirmed',
    rarity: 'Classified',
    float: 0.045678,
    exterior: 'Minimal Wear',
    paintSeed: 890,
    price: 45.20,
    imageUrl: 'https://via.placeholder.com/300x200/E91E63/FFFFFF?text=USP-S+Kill+Confirmed',
    game: 'Counter-Strike 2',
    tradeProtected: false,
  },
  {
    id: '8',
    name: 'AWP | Asiimov',
    rarity: 'Covert',
    float: 0.234567,
    exterior: 'Field-Tested',
    paintSeed: 345,
    price: 38.90,
    imageUrl: 'https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AWP+Asiimov',
    game: 'Counter-Strike 2',
    tradeProtected: false,
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

