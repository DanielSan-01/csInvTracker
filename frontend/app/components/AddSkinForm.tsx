"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { calculateTradeProtectionDate, calculateValveTradeLockDate } from '@/lib/utils';
import { useSkinCatalog } from '@/hooks/useSkinCatalog';
import type { SkinDto } from '@/lib/api';
import type { CSItem, Rarity, ItemType } from '@/lib/mockData';
import { getSkinDopplerDisplayName } from '@/lib/dopplerPhases';
import SkinCatalogSearch from './add-skin/SkinCatalogSearch';
import RequiredFieldsSection from './add-skin/RequiredFieldsSection';
import AdvancedFieldsSection from './add-skin/AdvancedFieldsSection';
import StickersSection from './add-skin/StickersSection';
import PreviewPanel from './add-skin/PreviewPanel';
import {
  EXTERIOR_PRESETS,
  buildPreviewImageUrl,
  deriveExteriorFromFloat,
} from './add-skin/helpers';
import type { AddSkinFormProps, NewSkinData } from './add-skin/types';

export default function AddSkinForm({ onAdd, onUpdate, onClose, item, initialSkin }: AddSkinFormProps) {
  const isEditMode = !!item;
  const [skinSearchTerm, setSkinSearchTerm] = useState(initialSkin?.name ?? '');
  const initialSearch = item?.name?.replace(/^★\s*/u, '') ?? initialSkin?.name ?? undefined;
  const { skins: catalogSkins, loading: catalogLoading, selectedSkin } = useSkinCatalog(
    skinSearchTerm,
    initialSearch
  );

  const effectiveSkin = selectedSkin ?? initialSkin;

  const baseFormState = useMemo<NewSkinData>(() => {
    // Calculate tradeLockDays from existing tradableAfter date if editing
    let tradeLockDays: number | undefined;
    if (item?.tradableAfter) {
      const now = new Date();
      const tradableDate = new Date(item.tradableAfter);
      const diffTime = tradableDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 7) {
        tradeLockDays = diffDays;
      }
    }

    const state = {
      skinId: item?.skinId ?? effectiveSkin?.id,
      name: item?.name ?? effectiveSkin?.name ?? '',
      rarity: item?.rarity ?? (effectiveSkin?.rarity as Rarity) ?? 'Mil-Spec',
      type: item?.type ?? (effectiveSkin?.type as ItemType) ?? 'Rifle',
      float: item?.float,
      paintSeed: item?.paintSeed,
      price: item?.price ?? Number(effectiveSkin?.defaultPrice ?? 0),
      cost: item?.cost,
      imageUrl: item?.imageUrl ?? effectiveSkin?.imageUrl,
      tradeProtected: item?.tradeProtected ?? false,
      tradeLockDays,
      stickers: item?.stickers,
    };
    console.log('[AddSkinForm] baseFormState initialized:', {
      itemId: item?.id,
      hasItem: !!item,
      stickersFromItem: item?.stickers,
      finalStickers: state.stickers,
    });
    return state;
  }, [item, effectiveSkin]);

  const [formData, setFormData] = useState<NewSkinData>(baseFormState);
  const updateFormData = (updates: Partial<NewSkinData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };
  const [selectedCatalogName, setSelectedCatalogName] = useState<string>('');

  useEffect(() => {
    setSkinSearchTerm(initialSkin?.name ?? '');
  }, [initialSkin]);

  useEffect(() => {
    setFormData(baseFormState);
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

    // Calculate tradableAfter date using Valve time (9am GMT+1 = 8am UTC)
    let tradableAfter: string | undefined;
    if (formData.tradeLockDays && formData.tradeLockDays > 0) {
      const date = calculateValveTradeLockDate(formData.tradeLockDays);
      tradableAfter = date.toISOString();
    }

    const submitData = {
      ...formData,
      tradeProtected: Boolean(formData.tradeLockDays && formData.tradeLockDays > 0),
      tradableAfter,
      // Remove imageUrl from submission - it will be auto-generated
      imageUrl: undefined,
    };
    
    console.log('[AddSkinForm] Submitting data:', {
      isEditMode,
      itemId: item?.id,
      stickers: submitData.stickers,
      stickerCount: submitData.stickers?.length || 0,
      fullSubmitData: submitData,
    });

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

  const selectedExterior = EXTERIOR_PRESETS.find((preset) => {
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

    const previewTradeProtected = Boolean(
      (formData.tradeLockDays && formData.tradeLockDays > 0) || item?.tradeProtected
    );

    let previewTradableAfter: Date | undefined;
    if (previewTradeProtected) {
      if (formData.tradeLockDays && formData.tradeLockDays > 0) {
        previewTradableAfter = calculateValveTradeLockDate(formData.tradeLockDays);
      } else {
        previewTradableAfter = item?.tradableAfter ?? calculateTradeProtectionDate();
      }
    }

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
              <SkinCatalogSearch
                searchTerm={skinSearchTerm}
                onSearchTermChange={setSkinSearchTerm}
                catalogSkins={catalogSkins}
                loading={catalogLoading}
                onSelectSkin={handleSearchSelect}
                selectedCatalogName={selectedCatalogName}
              />

              <RequiredFieldsSection
                formData={formData}
                errors={errors}
                exteriorPresets={EXTERIOR_PRESETS}
                selectedExterior={selectedExterior}
                onChange={updateFormData}
              />

                  <AdvancedFieldsSection
                    formData={formData}
                    errors={errors}
                    onChange={updateFormData}
                  />
                  <StickersSection
                    formData={formData}
                    onChange={updateFormData}
                  />
            </div>

            <PreviewPanel previewItem={previewItem} />
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

