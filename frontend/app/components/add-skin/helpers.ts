import type { Exterior } from '@/lib/mockData';

export type ExteriorPreset = {
  label: string;
  range: [number, number];
  floatValue: number;
};

export const EXTERIOR_PRESETS: ExteriorPreset[] = [
  { label: 'Factory New', range: [0, 0.07], floatValue: 0.01 },
  { label: 'Minimal Wear', range: [0.07, 0.15], floatValue: 0.08 },
  { label: 'Field-Tested', range: [0.15, 0.38], floatValue: 0.2 },
  { label: 'Well-Worn', range: [0.38, 0.45], floatValue: 0.42 },
  { label: 'Battle-Scarred', range: [0.45, 1], floatValue: 0.6 },
];

export const deriveExteriorFromFloat = (floatValue?: number): Exterior => {
  const float = typeof floatValue === 'number' ? Math.min(Math.max(floatValue, 0), 1) : 0;
  if (float < 0.07) return 'Factory New';
  if (float < 0.15) return 'Minimal Wear';
  if (float < 0.38) return 'Field-Tested';
  if (float < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
};

// Generate a simple SVG placeholder instead of relying on external services
const generateSvgPlaceholder = (text: string): string => {
  const encodedText = encodeURIComponent(text);
  return `data:image/svg+xml,${encodeURIComponent(`<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="200" fill="#4C1D95"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`)}`;
};

export const buildPreviewImageUrl = (
  name: string,
  provided?: string,
  fallback?: string
): string => {
  if (provided && provided.trim().length > 0) {
    return provided.trim();
  }

  if (fallback && fallback.trim().length > 0) {
    return fallback.trim();
  }

  const safeName = name?.trim().length ? name : 'Skin Preview';
  return generateSvgPlaceholder(safeName);
};


