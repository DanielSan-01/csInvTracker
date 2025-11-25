'use client';

import type { SkinDto } from '@/lib/api';

type DisplaySkin = Pick<SkinDto, 'name' | 'weapon' | 'type' | 'imageUrl'>;

type LoadoutSlotCardProps = {
  label: string;
  description?: string;
  selectedSkin?: SkinDto | null;
  fallbackSkin?: DisplaySkin | null;
  onClick: () => void;
  disabled?: boolean;
};

const LoadoutSlotCard = ({
  label,
  description,
  selectedSkin,
  fallbackSkin,
  onClick,
  disabled = false,
}: LoadoutSlotCardProps) => {
  const buttonClasses = [
    'group',
    'flex',
    'h-full',
    'flex-col',
    'rounded-2xl',
    'border',
    'border-gray-800',
    'bg-gray-900/50',
    'p-4',
    'text-left',
    'transition',
    disabled
      ? 'cursor-not-allowed opacity-60'
      : 'hover:border-purple-400/80 hover:bg-gray-900',
  ].join(' ');

  const displaySkin = selectedSkin ?? fallbackSkin ?? null;
  const isDefault = !selectedSkin && !!fallbackSkin;
  const tileClasses = [
    'flex min-h-[10rem] w-full flex-col overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-900/10',
    isDefault ? 'border border-dashed border-purple-500/30' : 'border border-purple-500/40',
  ].join(' ');

  return (
    <button onClick={onClick} className={buttonClasses} disabled={disabled}>
      <div className="flex grow flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            {description && <p className="text-xs text-gray-400">{description}</p>}
          </div>
          <svg
            className="h-5 w-5 text-purple-400 transition group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div className="flex flex-1 items-center justify-center">
          {displaySkin ? (
            <div className={tileClasses}>
              <div className="px-3 pt-2">
                <div className="rounded-lg bg-gray-900/80 px-3 py-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-purple-100 line-clamp-1">{displaySkin.name}</p>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        {displaySkin.weapon ?? displaySkin.type ?? 'Unknown'}
                      </p>
                    </div>
                    {isDefault && (
                      <span className="shrink-0 rounded-full border border-purple-500/50 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-1 min-h-[6rem] items-center justify-center px-3 pb-3">
                {displaySkin.imageUrl ? (
                  <img
                    src={displaySkin.imageUrl}
                    alt={displaySkin.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-purple-200">
                    No Image
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid h-24 w-full place-content-center rounded-xl border border-dashed border-gray-700 bg-gray-900/80 text-gray-600">
              <span className="text-sm">Select skin</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default LoadoutSlotCard;

