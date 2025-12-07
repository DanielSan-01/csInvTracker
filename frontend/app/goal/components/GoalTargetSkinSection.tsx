'use client';

import { useMemo } from 'react';
import GlobalSearchBar from '@/app/components/GlobalSearchBar';
import TargetSkinCard from '@/app/components/TargetSkinCard';
import ItemCard from '@/app/components/ItemCard';
import type { SkinDto } from '@/lib/api';
import type { CSItem, Rarity, ItemType } from '@/lib/mockData';

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
      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
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

        {/* Preview Panel */}
        <aside className="order-2 lg:order-none lg:sticky lg:top-6 lg:self-start">
          {previewItem ? (
            <div className="space-y-3">
              <ItemCard item={previewItem} variant="detailed" />
              
              {/* Cost Breakdown */}
              {parseFloat(targetSkinPrice) > 0 && (
                <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                    Affordability Breakdown
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Target Skin Cost</span>
                      <span className="font-semibold text-white">{formatCurrency(parseFloat(targetSkinPrice) || 0)}</span>
                    </div>
                    
                    {selectedTotal > 0 && (
                      <div className="flex items-center justify-between text-red-300">
                        <span>− From Planned Sales</span>
                        <span className="font-semibold">{formatCurrency(selectedTotal)}</span>
                      </div>
                    )}
                    
                    {parsedBalance > 0 && (
                      <div className="flex items-center justify-between text-red-300">
                        <span>− Existing Balance</span>
                        <span className="font-semibold">{formatCurrency(parsedBalance)}</span>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-gray-800">
                      {remainingAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Still Needed</span>
                          <span className="font-bold text-red-400">{formatCurrency(remainingAmount)}</span>
                        </div>
                      ) : surplusAmount > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Surplus</span>
                          <span className="font-bold text-emerald-400">+{formatCurrency(surplusAmount)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Status</span>
                          <span className="font-bold text-emerald-400">Fully Covered</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                Preview of your target skin
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-900/50">
              <div className="text-center">
                <p className="text-sm text-gray-400">No skin selected</p>
                <p className="mt-2 text-xs text-gray-500">
                  Search and select a skin to see preview
                </p>
              </div>
            </div>
          )}
        </aside>
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


