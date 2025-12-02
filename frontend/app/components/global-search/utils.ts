import type { SkinDto } from '@/lib/api';

const dopplerPhaseLabels: Record<number, string> = {
  415: 'Ruby',
  416: 'Sapphire',
  417: 'Black Pearl',
  418: 'Doppler Phase 1',
  419: 'Doppler Phase 2',
  420: 'Doppler Phase 3',
  421: 'Doppler Phase 4',
  569: 'Emerald',
};

export const rarityStyles: Record<string, string> = {
  'Consumer Grade': 'bg-gray-600 text-gray-100',
  'Industrial Grade': 'bg-blue-600 text-blue-100',
  'Mil-Spec': 'bg-blue-500 text-blue-100',
  'Mil-Spec Grade': 'bg-blue-500 text-blue-100',
  Restricted: 'bg-purple-600 text-purple-100',
  Classified: 'bg-pink-600 text-pink-100',
  Covert: 'bg-red-600 text-red-100',
  Contraband: 'bg-yellow-600 text-yellow-100',
  Extraordinary: 'bg-yellow-600 text-yellow-100',
};

export const getRarityColor = (rarity: string) => rarityStyles[rarity] ?? rarityStyles['Consumer Grade'];

export const getDopplerPhaseLabel = (skin: SkinDto) => {
  if (!skin.paintIndex) return undefined;
  return dopplerPhaseLabels[skin.paintIndex] ?? undefined;
};

export const getSkinDisplayName = (skin: SkinDto, phaseLabel?: string) => {
  if (phaseLabel) {
    return `${skin.name} (${phaseLabel})`;
  }
  return skin.name;
};


