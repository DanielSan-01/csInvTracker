'use client';

import { useState } from 'react';
import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';
import { Rarity, rarityColors, rarityBorderColors } from '@/lib/mockData';
import { CSItem } from '@/lib/mockData';
import { calculateTradeProtectionDate } from '@/lib/utils';

interface AddSkinFormProps {
  onAdd: (skinData: NewSkinData) => void;
  onUpdate?: (id: string, skinData: NewSkinData) => void;
  onClose: () => void;
  item?: CSItem; // If provided, form is in edit mode
}

export interface NewSkinData {
  name: string;
  rarity: Rarity;
  float?: number;
  paintSeed?: number;
  patternName?: string;
  price: number;
  cost?: number;
  imageUrl?: string;
  tradeProtected?: boolean;
}

export default function AddSkinForm({ onAdd, onUpdate, onClose, item }: AddSkinFormProps) {
  const isEditMode = !!item;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<NewSkinData>({
    name: item?.name || '',
    rarity: item?.rarity || 'Mil-Spec',
    float: item?.float,
    paintSeed: item?.paintSeed,
    patternName: undefined, // Not stored in CSItem currently
    price: item?.price || 0,
    cost: item?.cost,
    imageUrl: item?.imageUrl,
    tradeProtected: item?.tradeProtected || false,
  });
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

  const handleSubmit = (e: React.FormEvent) => {
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

    if (isEditMode && item && onUpdate) {
      onUpdate(item.id, submitData);
    } else {
      onAdd(submitData);
    }

    handleClose();
  };

  const rarities: Rarity[] = [
    'Consumer Grade',
    'Industrial Grade',
    'Mil-Spec',
    'Restricted',
    'Classified',
    'Covert',
    'Extraordinary',
    'Contraband',
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        ref={formRef}
        className="bg-gray-900 border-2 border-purple-500 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
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

            {/* Rarity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Rarity <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {rarities.map((rarity) => (
                  <label
                    key={rarity}
                    className={`relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.rarity === rarity
                        ? `${rarityBorderColors[rarity]} bg-gray-800`
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rarity"
                      value={rarity}
                      checked={formData.rarity === rarity}
                      onChange={(e) => setFormData({ ...formData, rarity: e.target.value as Rarity })}
                      className="sr-only"
                    />
                    <span className={`text-xs font-semibold text-center ${
                      formData.rarity === rarity ? 'text-white' : 'text-gray-400'
                    }`}>
                      {rarity.split(' ')[0]}
                    </span>
                    {formData.rarity === rarity && (
                      <div className={`absolute top-1 right-1 w-3 h-3 ${rarityColors[rarity]} rounded-full`} />
                    )}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Selected: <span className="text-purple-400">{formData.rarity}</span>
              </p>
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

              {/* Pattern Name/ID */}
              <div>
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
              <div>
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
              <div className="flex items-center gap-3">
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
                  Trade Protected
                </label>
              </div>
            </div>
          )}

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

