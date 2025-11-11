/**
 * Search Shorthands & Aliases
 * Maps common abbreviations to full skin names for better UX
 */

export const WEAPON_SHORTHANDS: Record<string, string> = {
  // Knives
  'bfk': 'Butterfly',
  'butterfly': 'Butterfly',
  'kara': 'Karambit',
  'karam': 'Karambit',
  'm9': 'M9 Bayonet',
  'bayo': 'Bayonet',
  'huntsman': 'Huntsman',
  'falchion': 'Falchion',
  'flip': 'Flip',
  'gut': 'Gut',
  'stiletto': 'Stiletto',
  'ursus': 'Ursus',
  'talon': 'Talon',
  'navaja': 'Navaja',
  'nomad': 'Nomad',
  'paracord': 'Paracord',
  'survival': 'Survival',
  'skeleton': 'Skeleton',
  
  // Rifles
  'ak': 'AK-47',
  'ak47': 'AK-47',
  'm4a4': 'M4A4',
  'm4a1': 'M4A1-S',
  'm4': 'M4A4',
  'awp': 'AWP',
  'aug': 'AUG',
  'sg': 'SG 553',
  'galil': 'Galil AR',
  'famas': 'FAMAS',
  
  // Pistols
  'deag': 'Desert Eagle',
  'deagle': 'Desert Eagle',
  'glock': 'Glock-18',
  'usp': 'USP-S',
  'p250': 'P250',
  'cz': 'CZ75-Auto',
  'fiveseven': 'Five-SeveN',
  '57': 'Five-SeveN',
  'dualies': 'Dual Berettas',
  'tec9': 'Tec-9',
  'p2k': 'P2000',
  
  // SMGs
  'mac10': 'MAC-10',
  'mp9': 'MP9',
  'mp7': 'MP7',
  'ump': 'UMP-45',
  'p90': 'P90',
  'bizon': 'PP-Bizon',
  'mp5': 'MP5-SD',
};

export const SKIN_SHORTHANDS: Record<string, string> = {
  // Doppler Phases
  'ph1': 'Phase 1',
  'ph2': 'Phase 2',
  'ph3': 'Phase 3',
  'ph4': 'Phase 4',
  'p1': 'Phase 1',
  'p2': 'Phase 2',
  'p3': 'Phase 3',
  'p4': 'Phase 4',
  'ruby': 'Ruby',
  'sapphire': 'Sapphire',
  'bp': 'Black Pearl',
  'emerald': 'Emerald',
  
  // Gamma Doppler
  'gamma': 'Gamma Doppler',
  'gamma1': 'Gamma Doppler Phase 1',
  'gamma2': 'Gamma Doppler Phase 2',
  'gamma3': 'Gamma Doppler Phase 3',
  'gamma4': 'Gamma Doppler Phase 4',
  
  // Popular Skins
  'dlore': 'Dragon Lore',
  'howl': 'Howl',
  'asiimov': 'Asiimov',
  'redline': 'Redline',
  'hyper': 'Hyper Beast',
  'fade': 'Fade',
  'marble': 'Marble Fade',
  'tiger': 'Tiger Tooth',
  'slaughter': 'Slaughter',
  'crimson': 'Crimson Web',
  'cw': 'Crimson Web',
  'autotronic': 'Autotronic',
  'lore': 'Lore',
  'neo': 'Neo-Noir',
  'noir': 'Neo-Noir',
};

export const WEAR_SHORTHANDS: Record<string, string> = {
  'fn': 'Factory New',
  'mw': 'Minimal Wear',
  'ft': 'Field-Tested',
  'ww': 'Well-Worn',
  'bs': 'Battle-Scarred',
};

/**
 * Expand search term with shorthands
 * Example: "bfk doppler ph4" → "Butterfly Doppler Phase 4"
 */
export function expandSearchTerm(term: string): string[] {
  const words = term.toLowerCase().trim().split(/\s+/);
  const expanded: string[] = [term]; // Always include original
  
  // Try to expand each word
  let fullyExpanded = words.map(word => {
    return WEAPON_SHORTHANDS[word] || SKIN_SHORTHANDS[word] || WEAR_SHORTHANDS[word] || word;
  }).join(' ');
  
  if (fullyExpanded !== term.toLowerCase()) {
    expanded.push(fullyExpanded);
  }
  
  // Also add partial expansions (for "kara fade" to find "Karambit Fade")
  const weaponExpanded = words.map(word => WEAPON_SHORTHANDS[word] || word).join(' ');
  if (weaponExpanded !== term.toLowerCase() && weaponExpanded !== fullyExpanded) {
    expanded.push(weaponExpanded);
  }
  
  return expanded;
}

/**
 * Fuzzy match - more forgiving search
 * Returns true if searchTerm matches targetString loosely
 */
export function fuzzyMatch(searchTerm: string, targetString: string): boolean {
  const search = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = targetString.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Exact match
  if (target.includes(search)) return true;
  
  // Check if all characters from search appear in target in order
  let searchIndex = 0;
  for (let i = 0; i < target.length && searchIndex < search.length; i++) {
    if (target[i] === search[searchIndex]) {
      searchIndex++;
    }
  }
  
  return searchIndex === search.length;
}

/**
 * Score a match (higher = better)
 */
export function scoreMatch(searchTerm: string, targetString: string): number {
  const search = searchTerm.toLowerCase();
  const target = targetString.toLowerCase();
  
  // Exact match = highest score
  if (target === search) return 1000;
  
  // Starts with = high score
  if (target.startsWith(search)) return 500;
  
  // Contains whole word = good score
  if (target.includes(search)) return 100;
  
  // Fuzzy match = okay score
  if (fuzzyMatch(search, target)) return 50;
  
  return 0;
}

