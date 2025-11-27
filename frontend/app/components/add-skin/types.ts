import type { CSItem, Rarity, ItemType } from '@/lib/mockData';
import type { SkinDto } from '@/lib/api';

export interface NewSkinData {
  skinId?: number;
  name: string;
  rarity: Rarity;
  type: ItemType;
  float?: number;
  paintSeed?: number;
  patternName?: string;
  price: number;
  cost?: number;
  imageUrl?: string;
  tradeProtected?: boolean;
}

export interface AddSkinFormProps {
  onAdd: (skinData: NewSkinData) => Promise<boolean | void> | boolean | void;
  onUpdate?: (id: string, skinData: NewSkinData) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
  item?: CSItem;
  initialSkin?: SkinDto;
}

