'use client';

import { useMemo } from 'react';
import GlobalSearchBar from '@/app/components/GlobalSearchBar';
import TargetSkinCard from '@/app/components/TargetSkinCard';
import ItemCard from '@/app/components/ItemCard';
import type { SkinDto } from '@/lib/api';
import type { CSItem, Rarity, ItemType } from '@/lib/mockData';

import GoalStepSection from './GoalStepSection';
import GoalAffordabilityPanel from './GoalAffordabilityPanel';

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
  selectedTotal: number;
  parsedBalance: number;
  remainingAmount: number;
  surplusAmount: number;
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
  selectedTotal,
  parsedBalance,
  remainingAmount,
  surplusAmount,
}: GoalTargetSkinSectionProps) => {
  // Create preview item from selected skin or manual input
  const previewItem = useMemo<CSItem | null>(() => {
    if (selectedSkin) {
      return {
        id: 'preview-goal-skin',
        name: targetSkinName || selectedSkin.name,
        price: parseFloat(targetSkinPrice) || selectedSkin.defaultPrice || 0,
        rarity: (selectedSkin.rarity as Rarity) || 'Mil-Spec',
        type: (selectedSkin.type as ItemType) || 'Rifle',
        weapon: selectedSkin.weapon,
        collection: selectedSkin.collection,
        imageUrl: selectedSkin.dopplerPhaseImageUrl ?? selectedSkin.imageUrl ?? '',
        float: 0.15, // Default float for preview
        exterior: 'Field-Tested',
        tradeProtected: false,
      };
    }
    
    if (targetSkinName.trim()) {
      return {
        id: 'preview-goal-skin',
        name: targetSkinName,
        price: parseFloat(targetSkinPrice) || 0,
        rarity: 'Mil-Spec' as Rarity,
        type: 'Rifle' as ItemType,
        imageUrl: '',
        float: 0.15,
        exterior: 'Field-Tested',
        tradeProtected: false,
      };
    }
    
    return null;
  }, [selectedSkin, targetSkinName, targetSkinPrice]);

  return (
    <GoalStepSection
      step={step}
      title="Pick the skin you're aiming for"
      description="Search the full catalog and we'll fill in the details for you."
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2 order-1">
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

          <div className="grid gap-4 md:grid-cols-2">
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

        {/* Preview Panel - matches main page style exactly */}
        <div className="lg:col-span-1 order-2 lg:order-none">
          <div className="space-y-6 lg:sticky lg:top-8">
            {previewItem ? (
              <ItemCard item={previewItem} variant="detailed" />
            ) : (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 p-10 text-center text-sm text-gray-400">
                Select a skin to view preview
              </div>
            )}
          </div>
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


