'use client';

import { ReactNode, useMemo } from 'react';
import { rarityGradients, Rarity } from '@/lib/mockData';

type TargetSkinCardProps = {
  badge?: string;
  name: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  rarity?: string | null;
  type?: string | null;
  tags?: Array<string | null | undefined>;
  priceLabel?: string;
  priceValue?: string;
  meta?: string;
  trailingContent?: ReactNode;
  className?: string;
};

const FALLBACK_GRADIENT = 'from-gray-900/60 via-gray-950/60 to-black/60';

export default function TargetSkinCard({
  badge,
  name,
  subtitle,
  imageUrl,
  rarity,
  type,
  tags,
  priceLabel,
  priceValue,
  meta,
  trailingContent,
  className = '',
}: TargetSkinCardProps) {
  const gradientClass = useMemo(() => {
    if (!rarity) return FALLBACK_GRADIENT;
    const normalized = rarity.trim() as Rarity;
    return rarityGradients[normalized] ?? FALLBACK_GRADIENT;
  }, [rarity]);

  const combinedTags = useMemo(() => {
    const baseTags: string[] = [];
    if (type) baseTags.push(type);
    if (rarity && rarity !== type) baseTags.push(rarity);
    if (tags) {
      for (const tag of tags) {
        if (!tag) continue;
        if (!baseTags.includes(tag)) {
          baseTags.push(tag);
        }
      }
    }
    return baseTags;
  }, [type, rarity, tags]);

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900/70 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-center gap-4 sm:flex-1">
        <div
          className={`relative flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-b ${gradientClass} sm:h-28 sm:w-28`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${name} preview`}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          ) : (
            <span className="text-[10px] uppercase tracking-widest text-gray-500">No image</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {badge && (
            <p className="type-label text-purple-200/80">{badge}</p>
          )}
          <h3 className="truncate type-heading-md text-white">{name}</h3>
          {subtitle && <p className="truncate type-body-sm text-gray-400">{subtitle}</p>}
          {meta && <p className="mt-2 type-body-xs text-gray-500">{meta}</p>}
          {combinedTags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {combinedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-700 bg-gray-900/80 px-2.5 py-1 type-body-xs text-gray-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {(priceLabel || priceValue || trailingContent) && (
        <div className="flex flex-col items-stretch justify-end gap-2 sm:items-end">
          {priceLabel && (
            <p className="type-label text-gray-500">{priceLabel}</p>
          )}
          {priceValue && <p className="type-heading-md text-white">{priceValue}</p>}
          {trailingContent}
        </div>
      )}
    </div>
  );
}

