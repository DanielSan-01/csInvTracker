import type { SkinDto } from '@/lib/api';

export type Team = 'CT' | 'T' | 'Both';

export type LoadoutSlot = {
  key: string;
  label: string;
  description?: string;
  filter: (skin: SkinDto) => boolean;
  teamHint?: Team;
};

export type LoadoutSection = {
  title: string;
  slots: LoadoutSlot[];
};

export type LoadoutSelectionEntry = {
  skin: SkinDto;
  inventoryId?: number;
};

export type SlotTeamSelection = {
  ct?: LoadoutSelectionEntry;
  t?: LoadoutSelectionEntry;
};

export type LoadoutSelections = Record<string, SlotTeamSelection>;

export type InventoryEntry = {
  inventoryId: number;
  skin: SkinDto;
  team: Team;
  maxUsage: number;
};

export type PendingChoice = {
  slot: LoadoutSlot;
  team: 'CT' | 'T';
  options: InventoryEntry[];
};

export type SkinImageSource = {
  imageUrl?: string | null;
  weapon?: string | null;
  type?: string | null;
};





