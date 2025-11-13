import type { SkinDto } from './api';

type DopplerSource = {
  name: string;
  paintIndex?: number | null;
};

const dopplerPhaseLabels: Record<number, string> = {
  415: 'Ruby',
  416: 'Sapphire',
  417: 'Black Pearl',
  418: 'Doppler Phase 1',
  419: 'Doppler Phase 2',
  420: 'Doppler Phase 3',
  421: 'Doppler Phase 4',
  568: 'Gamma Emerald',
  569: 'Gamma Phase 1',
  570: 'Gamma Phase 2',
  572: 'Gamma Phase 4',
  617: 'Black Pearl',
  618: 'Doppler Phase 2',
  619: 'Sapphire',
  852: 'Doppler Phase 1',
  853: 'Doppler Phase 2',
  854: 'Doppler Phase 3',
  855: 'Doppler Phase 4',
  1119: 'Gamma Emerald',
  1120: 'Gamma Phase 1',
  1121: 'Gamma Phase 2',
  1122: 'Gamma Phase 3',
  1123: 'Gamma Phase 4',
};

export function getDopplerPhaseLabel<T extends DopplerSource>(item: T): string | null {
  if (!item.paintIndex) return null;
  if (!item.name.toLowerCase().includes('doppler')) return null;
  return dopplerPhaseLabels[item.paintIndex] ?? null;
}

export function getDopplerDisplayName(item: DopplerSource): string {
  const label = getDopplerPhaseLabel(item);
  return label ? `${item.name} (${label})` : item.name;
}

export function getSkinDopplerDisplayName(skin: SkinDto): string {
  return getDopplerDisplayName({ name: skin.name, paintIndex: skin.paintIndex });
}


