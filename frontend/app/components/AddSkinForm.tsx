"use client";

import { useMemo, useState } from "react";
import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';
import ItemCard from './ItemCard';
import { CSItem, Rarity, ItemType, Exterior } from '@/lib/mockData';
import { calculateTradeProtectionDate } from '@/lib/utils';
import { useSkinCatalog } from '@/hooks/useSkinCatalog';
import { SkinDto } from '@/lib/api';
import { getDopplerPhaseLabel, getSkinDopplerDisplayName } from '@/lib/dopplerPhases';

const deriveExteriorFromFloat = (floatValue?: number): Exterior => {
  const float = typeof floatValue === 'number' ? Math.min(Math.max(floatValue, 0), 1) : 0;
  if (float < 0.07) return 'Factory New';
  if (float < 0.15) return 'Minimal Wear';
  if (float < 0.38) return 'Field-Tested';
  if (float < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
};

const buildPreviewImageUrl = (name: string, provided?: string, fallback?: string): string => {
  if (provided && provided.trim().length > 0) {
    return provided.trim();
  }
  if (fallback && fallback.trim().length > 0) {
    return fallback.trim();
  }
  const safeName = name?.trim().length ? name : 'Skin Preview';
  return `https://via.placeholder.com/300x200/4C1D95/FFFFFF?text=${encodeURIComponent(safeName)}`;
};

interface AddSkinFormProps {
  onAdd: (skinData: NewSkinData) => Promise<boolean | void> | boolean | void;
  onUpdate?: (id: string, skinData: NewSkinData) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
  item?: CSItem; // If provided, form is in edit mode
  initialSkin?: SkinDto; // When provided, pre-fill with catalog skin (quick add)
}

export interface NewSkinData {
  skinId?: number; // Backend skin catalog ID
  name: string;
  rarity: Rarity;
  type: ItemType;
  float?: number;
  paintSeed?: number;
  patternName?: string;
  price: number;
  cost?: number;
  imageUrl?: string;
  tradeProtected?: boolean;
}

export default function AddSkinForm({ onAdd, onUpdate, onClose, item, initialSkin }: AddSkinFormProps) {
  const isEditMode = !!item;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [skinSearchTerm, setSkinSearchTerm] = useState(initialSkin?.name ?? '');
  const initialSearch = item?.name?.replace(/^★\s*/u, '') ?? initialSkin?.name ?? undefined;
  const { skins: catalogSkins, loading: catalogLoading, selectedSkin } = useSkinCatalog(
    skinSearchTerm,
    initialSearch
  );

  const effectiveSkin = selectedSkin ?? initialSkin;

  const baseFormState = useMemo<NewSkinData>(() => ({
    skinId: item?.skinId ?? effectiveSkin?.id,
    name: item?.name ?? effectiveSkin?.name ?? '',
    rarity: item?.rarity ?? (effectiveSkin?.rarity as Rarity) ?? 'Mil-Spec',
    type: item?.type ?? (effectiveSkin?.type as ItemType) ?? 'Rifle',
    float: item?.float,
    paintSeed: item?.paintSeed,
    patternName: undefined,
    price: item?.price ?? Number(effectiveSkin?.defaultPrice ?? 0),
    cost: item?.cost,
    imageUrl: item?.imageUrl ?? effectiveSkin?.imageUrl,
    tradeProtected: item?.tradeProtected ?? false,
  }), [item, effectiveSkin]);

  const [formData, setFormData] = useState<NewSkinData>(baseFormState);
  const [selectedCatalogName, setSelectedCatalogName] = useState<string>('');

  useEffect(() => {
    setSkinSearchTerm(initialSkin?.name ?? '');
  }, [initialSkin]);

  useEffect(() => {
    setFormData(baseFormState);
    if (
      baseFormState.float !== undefined ||
      baseFormState.paintSeed !== undefined ||
      baseFormState.cost !== undefined ||
      baseFormState.imageUrl
    ) {
      setShowAdvanced(true);
    }
  }, [baseFormState]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formRef.current && overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );
      gsap.fromTo(
        formRef.current,
        { opacity: 0, y: 50, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }, []);

  const handleClose = () => {
    if (formRef.current && overlayRef.current) {
      gsap.to(formRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        duration: 0.3,
        onComplete: onClose,
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
      });
    } else {
      onClose();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.skinId) {
      newErrors.skinId = 'Please select a skin from the catalog';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Skin name is required';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    if (formData.float !== undefined) {
      if (formData.float < 0 || formData.float > 1) {
        newErrors.float = 'Float must be between 0 and 1';
      }
    }

    if (formData.paintSeed !== undefined && formData.paintSeed < 0) {
      newErrors.paintSeed = 'Paint Seed cannot be negative';
    }

    if (formData.cost !== undefined && formData.cost < 0) {
      newErrors.cost = 'Cost cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    // Generate a simple image URL placeholder if not provided
    const imageUrl = formData.imageUrl || `https://via.placeholder.com/300x200/4C1D95/FFFFFF?text=${encodeURIComponent(formData.name)}`;

    // Set tradableAfter date if trade protected is checked
    const submitData = {
      ...formData,
      imageUrl,
      tradeProtected: formData.tradeProtected || false,
    };

    try {
      let result: boolean | void | undefined;

      if (isEditMode && item && onUpdate) {
        result = await Promise.resolve(onUpdate(item.id, submitData));
      } else {
        result = await Promise.resolve(onAdd(submitData));
      }

      if (result === false) {
        return;
      }

      handleClose();
    } catch (error) {
      console.error('Error submitting skin form:', error);
    }
  };

  const exteriorPresets = [
    {
      label: 'Factory New',
      range: [0, 0.07] as [number, number],
      floatValue: 0.01,
    },
    {
      label: 'Minimal Wear',
      range: [0.07, 0.15] as [number, number],
      floatValue: 0.08,
    },
    {
      label: 'Field-Tested',
      range: [0.15, 0.38] as [number, number],
      floatValue: 0.20,
    },
    {
      label: 'Well-Worn',
      range: [0.38, 0.45] as [number, number],
      floatValue: 0.42,
    },
    {
      label: 'Battle-Scarred',
      range: [0.45, 1] as [number, number],
      floatValue: 0.60,
    },
  ];

  const selectedExterior = exteriorPresets.find((preset) => {
    if (formData.float === undefined) return false;
    const [min, max] = preset.range;
    if (preset.label === 'Battle-Scarred') {
      return formData.float >= min && formData.float <= max;
    }
    return formData.float >= min && formData.float < max;
  });

  const fillFromCatalog = (skin: SkinDto) => {
    setSelectedCatalogName(getSkinDopplerDisplayName(skin));
    
    setFormData((prev) => ({
      ...prev,
      skinId: skin.id,
      name: skin.name,
      rarity: skin.rarity as Rarity,
      type: skin.type as ItemType,
      price: skin.defaultPrice ? Number(skin.defaultPrice) : prev.price,
      imageUrl: skin.imageUrl,
      // Keep user's existing float, cost, paintSeed, etc.
    }));

    // Close the search dropdown
    setSkinSearchTerm('');
  };

  // Auto-fill search when editing
  useEffect(() => {
    if (isEditMode && item) {
      // In edit mode, we already have the item populated
      // but we still need the skinId - for now we'll need to search for it
      // This is a limitation we can improve later
    }
  }, [isEditMode, item]);

  const handleSearchSelect = (skin: SkinDto) => {
    fillFromCatalog(skin);
    const advancedNeeded = skin.defaultPrice !== undefined || skin.imageUrl;
    if (advancedNeeded) {
      setShowAdvanced(true);
    }
  };

  const resetCatalogSelection = () => {
    setSelectedCatalogName('');
    if (!isEditMode) {
      setFormData(baseFormState);
      setShowAdvanced(false);
    }
  };

  const previewItem = useMemo<CSItem>(() => {
    const previewName =
      (formData.name && formData.name.trim().length > 0)
        ? formData.name
        : effectiveSkin?.name ?? item?.name ?? 'Skin Preview';

    const previewRarity =
      formData.rarity ?? (effectiveSkin?.rarity as Rarity) ?? item?.rarity ?? 'Mil-Spec';

    const previewFloat =
      formData.float !== undefined
        ? formData.float
        : item?.float !== undefined
          ? item.float
          : 0.25;

    const previewType =
      formData.type ?? (effectiveSkin?.type as ItemType) ?? item?.type ?? 'Rifle';

    const previewTradeProtected =
      formData.tradeProtected ?? item?.tradeProtected ?? false;

    const previewTradableAfter = previewTradeProtected
      ? item?.tradableAfter ?? calculateTradeProtectionDate()
      : undefined;

    const previewImage = buildPreviewImageUrl(
      previewName,
      formData.imageUrl,
      effectiveSkin?.imageUrl ?? item?.imageUrl,
    );

    return {
      id: item?.id ?? 'preview-item',
      skinId: formData.skinId ?? item?.skinId ?? effectiveSkin?.id,
      name: previewName,
      rarity: previewRarity,
      float: previewFloat,
      exterior: deriveExteriorFromFloat(previewFloat),
      paintSeed: formData.paintSeed ?? item?.paintSeed,
      paintIndex: effectiveSkin?.paintIndex ?? item?.paintIndex,
      price: formData.price ?? item?.price ?? 0,
      cost: formData.cost ?? item?.cost,
      imageUrl: previewImage,
      type: previewType,
      collection: effectiveSkin?.collection ?? item?.collection,
      weapon: effectiveSkin?.weapon ?? item?.weapon,
      tradeProtected: previewTradeProtected,
      tradableAfter: previewTradableAfter,
      dopplerPhase: effectiveSkin?.dopplerPhase ?? item?.dopplerPhase,
      dopplerPhaseImageUrl: effectiveSkin?.dopplerPhaseImageUrl ?? item?.dopplerPhaseImageUrl,
    };
  }, [effectiveSkin, formData, item]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        ref={formRef}
        className="bg-gray-900 border-2 border-purple-500 rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isEditMode ? 'Edit Skin' : 'Add New Skin'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <div className="space-y-6">
          {/* Quick Fill */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 shadow-inner shadow-purple-900/20 space-y-3">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-200">Search Skin Catalog (1,071 skins)</p>
                <p className="text-xs text-purple-300/70">
                  Search by name (e.g., "AK-47", "Dragon Lore"). Selected skin will pre-fill fields.
                </p>
              </div>
              {selectedCatalogName && (
                <div className="text-xs text-purple-300 bg-purple-900/40 px-2 py-1 rounded">
                  Selected: {selectedCatalogName}
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={skinSearchTerm}
                onChange={(e) => setSkinSearchTerm(e.target.value)}
                placeholder="Type to search (e.g., AWP, AK-47, Fade)..."
                className="flex-1 w-full rounded-lg border border-purple-400/50 bg-gray-900/60 px-4 py-2 text-sm text-purple-100 placeholder-purple-200/40 focus:border-purple-300 focus:outline-none"
              />
              
              {/* Search Results Dropdown */}
              {skinSearchTerm.length >= 2 && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-gray-900 border border-purple-500/50 rounded-lg shadow-xl">
                  {catalogLoading ? (
                    <div className="p-4 text-center text-purple-300 text-sm">
                      Searching...
                    </div>
                  ) : catalogSkins.length > 0 ? (
                    <div className="py-1">
                      {catalogSkins.slice(0, 50).map((skin) => {
                        const phaseLabel = getDopplerPhaseLabel(skin);
                        const displayName = getSkinDopplerDisplayName(skin);
                        return (
                          <button
                            key={skin.id}
                            type="button"
                            onClick={() => handleSearchSelect(skin)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-purple-500/20 transition-colors flex items-center gap-3 group"
                          >
                            {skin.imageUrl ? (
                              <img
                                src={skin.imageUrl}
                                alt={skin.name}
                                className="w-12 h-10 object-contain rounded border border-purple-500/40 bg-gray-950/60"
                              />
                            ) : (
                              <div className="w-12 h-10 rounded border border-purple-500/40 bg-purple-900/40 flex items-center justify-center text-xs text-purple-200">
                                No Img
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-purple-100 group-hover:text-white truncate">{displayName}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className="text-gray-400">{skin.rarity}</span>
                                {phaseLabel && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 font-semibold">
                                    {phaseLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {catalogSkins.length > 50 && (
                        <div className="px-4 py-2 text-xs text-gray-400 border-t border-purple-500/30">
                          Showing first 50 of {catalogSkins.length} results. Type more to narrow down.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      No skins found. Try a different search.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Required Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-400 border-b border-purple-500 pb-2">
              Required Information
            </h3>

            {/* Skin Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Skin Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 bg-gray-800 border-2 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="e.g., AK-47 | Fire Serpent"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Exterior Quick Select */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Exterior quick select
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {exteriorPresets.map((preset) => {
                  const isSelected = selectedExterior?.label === preset.label;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, float: preset.floatValue })}
                      className={`relative flex items-center justify-center rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-purple-400 bg-purple-500/10 text-white'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {preset.label}
                      {isSelected && <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-purple-400" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Selected exterior:{' '}
                <span className="text-purple-400">
                  {selectedExterior ? selectedExterior.label : 'Custom'}
                </span>{' '}
                · Float{' '}
                <span className="text-purple-400">
                  {formData.float !== undefined ? formData.float.toFixed(3) : '—'}
                </span>
              </p>
              {formData.rarity && (
                <p className="mt-1 text-xs text-gray-500">
                  Rarity: <span className="text-gray-300">{formData.rarity}</span> (auto-detected)
                </p>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price (USD) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className={`w-full px-4 py-2 bg-gray-800 border-2 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="0.00"
                required
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-400">{errors.price}</p>
              )}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <svg
                className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="font-medium">Show Advanced Options (Optional)</span>
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t border-gray-700 animate-fadeIn">
              <h3 className="text-lg font-semibold text-gray-400 border-b border-gray-700 pb-2">
                Optional Information
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Float Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Float Value (0.0 - 1.0)
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    min="0"
                    max="1"
                    value={formData.float ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      float: e.target.value ? parseFloat(e.target.value) : undefined,
                    })}
                    className={`w-full px-4 py-2 bg-gray-800 border-2 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                      errors.float ? 'border-red-500' : 'border-gray-700'
                    }`}
                    placeholder="e.g., 0.564978"
                  />
                  {errors.float && (
                    <p className="mt-1 text-sm text-red-400">{errors.float}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty if unknown. Float determines wear condition.
                  </p>
                </div>

                {/* Paint Seed */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Paint Seed
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.paintSeed ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      paintSeed: e.target.value ? parseInt(e.target.value) : undefined,
                    })}
                    className={`w-full px-4 py-2 bg-gray-800 border-2 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                      errors.paintSeed ? 'border-red-500' : 'border-gray-700'
                    }`}
                    placeholder="e.g., 396"
                  />
                  {errors.paintSeed && (
                    <p className="mt-1 text-sm text-red-400">{errors.paintSeed}</p>
                  )}
                </div>

                {/* Pattern Name/ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pattern Name / Pattern ID
                  </label>
                  <input
                    type="text"
                    value={formData.patternName ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      patternName: e.target.value || undefined,
                    })}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    placeholder="e.g., Phase 4, Tiger Tooth, Urban Masked"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Pattern name or ID (e.g., "Doppler Phase 4" or pattern number)
                  </p>
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cost (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      cost: e.target.value ? parseFloat(e.target.value) : undefined,
                    })}
                    className={`w-full px-4 py-2 bg-gray-800 border-2 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                      errors.cost ? 'border-red-500' : 'border-gray-700'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.cost && (
                    <p className="mt-1 text-sm text-red-400">{errors.cost}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    The amount you paid for this item (used for profit calculation)
                  </p>
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      imageUrl: e.target.value || undefined,
                    })}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to auto-generate placeholder
                  </p>
                </div>

                {/* Trade Protected */}
                <div className="md:col-span-2 flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3">
                  <input
                    type="checkbox"
                    id="tradeProtected"
                    checked={formData.tradeProtected || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      tradeProtected: e.target.checked || undefined,
                    })}
                    className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="tradeProtected" className="text-sm font-medium text-gray-300">
                    Item is trade protected (set trade lock reminder)
                  </label>
                </div>
              </div>
            </div>
          )}
            </div>
            <aside className="space-y-3 lg:sticky lg:top-6">
              <ItemCard item={previewItem} variant="detailed" />
              <p className="text-xs text-gray-500">
                Preview does not adjust for float-capped items.
              </p>
            </aside>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-700">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              {isEditMode ? 'Update Skin' : 'Add Skin'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

