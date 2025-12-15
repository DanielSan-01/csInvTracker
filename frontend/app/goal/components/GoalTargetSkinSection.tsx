'use client';

import GlobalSearchBar from '@/app/components/GlobalSearchBar';
import TargetSkinCard from '@/app/components/TargetSkinCard';
import type { SkinDto } from '@/lib/api';
import type { CSItem } from '@/lib/mockData';

import GoalStepSection from './GoalStepSection';

type GoalTargetSkinSectionProps = {
  step: number;
  inventoryItems: CSItem[];
  targets: {
    id: string;
    skin: SkinDto | null;
    name: string;
    price: string;
    imageUrl?: string | null;
  }[];
  activeTargetId: string;
  onSetActiveTarget: (id: string) => void;
  onSelectSkin: (id: string, skin: SkinDto) => void;
  onClearSkin: (id: string) => void;
  onNameChange: (id: string, value: string) => void;
  onPriceChange: (id: string, value: string) => void;
  onAddTarget: () => void;
  onRemoveTarget: (id: string) => void;
  canAddMore: boolean;
  formatCurrency: (value: number) => string;
};

const GoalTargetSkinSection = ({
  step,
  inventoryItems,
  targets,
  activeTargetId,
  onSetActiveTarget,
  onSelectSkin,
  onClearSkin,
  onNameChange,
  onPriceChange,
  onAddTarget,
  onRemoveTarget,
  canAddMore,
  formatCurrency,
}: GoalTargetSkinSectionProps) => {
  return (
    <GoalStepSection
      step={step}
      title="Pick the skins you're aiming for"
      description="Search the catalog and set target prices. You can add up to 10 targets."
    >
      <div className="space-y-4">
        <GlobalSearchBar
          userInventory={inventoryItems}
          onAddSkin={(skin) => onSelectSkin(activeTargetId, skin)}
          isLoggedIn
          actionLabel="Select"
          allowDuplicateSelection
        />

        <div className="space-y-3">
          {targets.map((target, idx) => (
            <div key={target.id} className="rounded-2xl border border-gray-800 bg-gray-950/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={activeTargetId === target.id}
                    onChange={() => onSetActiveTarget(target.id)}
                    className="h-4 w-4 text-purple-500 focus:ring-purple-500"
                    title="Apply catalog search to this target"
                  />
                  <p className="text-sm text-gray-300">Target #{idx + 1}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {target.skin ? 'Catalog selected' : 'Manual entry'}
                  </span>
                  {targets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveTarget(target.id)}
                      className="rounded border border-red-500/50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-red-200 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {target.skin && (
                <TargetSkinCard
                  badge="Selected skin"
                  name={target.skin.name}
                  subtitle={target.skin.weapon ?? target.skin.type}
                  imageUrl={target.skin.dopplerPhaseImageUrl ?? target.skin.imageUrl}
                  rarity={target.skin.rarity}
                  type={target.skin.type}
                  tags={[
                    target.skin.collection ? `${target.skin.collection}` : null,
                    target.skin.dopplerPhase ??
                      (target.skin.paintIndex ? `Pattern ${target.skin.paintIndex}` : null),
                  ]}
                  priceLabel={
                    target.skin.defaultPrice && target.skin.defaultPrice > 0 ? 'Catalog price' : undefined
                  }
                  priceValue={
                    target.skin.defaultPrice && target.skin.defaultPrice > 0
                      ? formatCurrency(target.skin.defaultPrice)
                      : undefined
                  }
                  trailingContent={
                    <button
                      type="button"
                      onClick={() => onClearSkin(target.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-purple-400/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-purple-100 transition-colors hover:border-purple-300/70 hover:bg-purple-500/20"
                    >
                      Clear
                    </button>
                  }
                />
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <LabeledInput
                  label="Skin name"
                  value={target.name}
                  onChange={(value) => onNameChange(target.id, value)}
                />
                <LabeledInput
                  label="Target price (USD)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={target.price}
                  onChange={(value) => onPriceChange(target.id, value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Select a target row (radio) to apply catalog search; prices can be edited manually.
          </p>
          <button
            type="button"
            onClick={onAddTarget}
            disabled={!canAddMore}
            className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add another target ({targets.length}/10)
          </button>
        </div>
      </div>
    </GoalStepSection>
  );
};

type LabeledInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  step?: string;
};

const LabeledInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  step,
}: LabeledInputProps) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm text-gray-300">{label}</span>
    <input
      type={type}
      value={value}
      min={min}
      step={step}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
    />
  </label>
);

export default GoalTargetSkinSection;


