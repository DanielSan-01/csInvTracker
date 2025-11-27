import type { CSItem } from '@/lib/mockData';
import { exteriorAbbr, rarityGradients } from '@/lib/mockData';
import type { ItemCardAnimation } from '../ItemCardShared';

type DetailImageProps = {
  item: CSItem;
  animation: ItemCardAnimation;
};

export default function DetailImage({ item, animation }: DetailImageProps) {
  return (
    <div
      ref={animation.imageContainerRef}
      className={`flex w-full items-center justify-center bg-gradient-to-b ${rarityGradients[item.rarity]}`}
      style={{
        opacity: animation.imageLoaded ? 1 : 0.3,
        filter: animation.imageLoaded ? 'brightness(1)' : 'brightness(0.5)',
      }}
    >
      <div
        ref={animation.imageRef}
        className="flex h-full w-full items-center justify-center px-6 pt-10 pb-6"
      >
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950/70 via-gray-950/0 to-gray-950/40" />

      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-white/30 bg-black/40 px-3 py-1 text-xs font-semibold text-white">
          {exteriorAbbr[item.exterior]}
        </span>
        {item.tradeProtected && item.tradableAfter ? (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3a.75.75 0 01.75.75v3.17l2.03 2.03a.75.75 0 11-1.06 1.06l-2.25-2.25A.75.75 0 019.25 9V5.75A.75.75 0 0110 5z"
                clipRule="evenodd"
              />
            </svg>
            Trade locked
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-7.5 9a.75.75 0 01-1.079.082l-3.5-3.25a.75.75 0 011.02-1.1l2.907 2.701 7.023-8.43a.75.75 0 011.052-.143z"
                clipRule="evenodd"
              />
            </svg>
            Trade ready
          </span>
        )}
      </div>
    </div>
  );
}

