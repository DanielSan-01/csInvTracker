'use client';

import GlobalSearchBar from '@/app/components/GlobalSearchBar';
import TargetSkinCard from '@/app/components/TargetSkinCard';
import type { SkinDto } from '@/lib/api';
import type { CSItem } from '@/lib/mockData';

import GoalStepSection from './GoalStepSection';

type GoalTargetSkinSectionProps = {
  step: number;
  selectedSkin: SkinDto | null;
  inventoryItems: CSItem[];
  onSkinSelect: (skin: SkinDto) => void;
  onClearSkin: () => void;
  targetSkinName: string;
  onTargetSkinNameChange: (value: string) => void;
  targetSkinPrice: string;
  onTargetSkinPriceChange: (value: string) => void;
  formatCurrency: (value: number) => string;
};

const GoalTargetSkinSection = ({
  step,
  selectedSkin,
  inventoryItems,
  onSkinSelect,
  onClearSkin,
  targetSkinName,
  onTargetSkinNameChange,
  targetSkinPrice,
  onTargetSkinPriceChange,
  formatCurrency,
}: GoalTargetSkinSectionProps) => {
  return (
    <GoalStepSection
      step={step}
      title="Pick the skin you’re aiming for"
      description="Search the full catalog and we’ll fill in the details for you."
    >
      <div className="space-y-4">
        <GlobalSearchBar
          userInventory={inventoryItems}
          onAddSkin={onSkinSelect}
          isLoggedIn
          actionLabel="Select"
          allowDuplicateSelection
        />

        {selectedSkin && (
          <TargetSkinCard
            badge="Selected skin"
            name={selectedSkin.name}
            subtitle={selectedSkin.weapon ?? selectedSkin.type}
            imageUrl={selectedSkin.dopplerPhaseImageUrl ?? selectedSkin.imageUrl}
            rarity={selectedSkin.rarity}
            type={selectedSkin.type}
            tags={[
              selectedSkin.collection ? `${selectedSkin.collection}` : null,
              selectedSkin.dopplerPhase ??
                (selectedSkin.paintIndex ? `Pattern ${selectedSkin.paintIndex}` : null),
            ]}
            priceLabel={
              selectedSkin.defaultPrice && selectedSkin.defaultPrice > 0 ? 'Catalog price' : undefined
            }
            priceValue={
              selectedSkin.defaultPrice && selectedSkin.defaultPrice > 0
                ? formatCurrency(selectedSkin.defaultPrice)
                : undefined
            }
            trailingContent={
              <button
                type="button"
                onClick={onClearSkin}
                className="inline-flex items-center justify-center rounded-lg border border-purple-400/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-purple-100 transition-colors hover:border-purple-300/70 hover:bg-purple-500/20"
              >
                Clear
              </button>
            }
          />
        )}

        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <LabeledInput
            label="Skin name"
            value={targetSkinName}
            onChange={onTargetSkinNameChange}
          />
          <LabeledInput
            label="Target price (USD)"
            type="number"
            min="0"
            step="0.01"
            value={targetSkinPrice}
            onChange={onTargetSkinPriceChange}
            placeholder="0.00"
          />
        </div>

        <p className="text-xs text-gray-500">
          You can fine-tune the name or price manually even after selecting a skin from search.
        </p>
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


