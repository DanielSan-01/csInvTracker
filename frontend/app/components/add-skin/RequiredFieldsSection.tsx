import type { NewSkinData } from './types';
import type { ExteriorPreset } from './helpers';

type RequiredFieldsSectionProps = {
  formData: NewSkinData;
  errors: Record<string, string>;
  exteriorPresets: ExteriorPreset[];
  selectedExterior?: ExteriorPreset;
  onChange: (updates: Partial<NewSkinData>) => void;
};

export default function RequiredFieldsSection({
  formData,
  errors,
  exteriorPresets,
  selectedExterior,
  onChange,
}: RequiredFieldsSectionProps) {
  const showQuantity = formData.type === 'Case' || formData.type === 'Sticker';

  return (
    <div className="space-y-4">
      <h3 className="border-b border-purple-500 pb-2 text-lg font-semibold text-purple-400">
        Required Information
      </h3>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Skin Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(event) => onChange({ name: event.target.value })}
          className={`w-full rounded-lg border-2 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
            errors.name ? 'border-red-500 bg-gray-900' : 'border-gray-700 bg-gray-800'
          }`}
          placeholder="e.g., AK-47 | Fire Serpent"
          required
        />
        {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-gray-300">
          Exterior quick select
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {exteriorPresets.map((preset) => {
            const isSelected = selectedExterior?.label === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange({ float: preset.floatValue })}
                className={`relative flex items-center justify-center rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-purple-400 bg-purple-500/10 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                {preset.label}
                {isSelected && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-purple-400" />
                )}
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

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">
          Price (USD) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.price || ''}
          onChange={(event) =>
            onChange({ price: parseFloat(event.target.value) || 0 })
          }
          className={`w-full rounded-lg border-2 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
            errors.price ? 'border-red-500 bg-gray-900' : 'border-gray-700 bg-gray-800'
          }`}
          placeholder="0.00"
          required
        />
        {errors.price && <p className="mt-1 text-sm text-red-400">{errors.price}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-300">Cost (USD)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.cost ?? ''}
          onChange={(event) =>
            onChange({
              cost: event.target.value ? parseFloat(event.target.value) : undefined,
            })
          }
          className={`w-full rounded-lg border-2 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
            errors.cost ? 'border-red-500 bg-gray-900' : 'border-gray-700 bg-gray-800'
          }`}
          placeholder="0.00"
        />
        {errors.cost && <p className="mt-1 text-sm text-red-400">{errors.cost}</p>}
        <p className="mt-1 text-xs text-gray-500">
          The amount you paid for this item (used for profit calculation)
        </p>
      </div>

      {showQuantity && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Quantity (1–1000) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            value={formData.quantity ?? 1}
            onChange={(event) =>
              onChange({
                quantity: Math.min(
                  1000,
                  Math.max(1, Math.floor(Number(event.target.value) || 0))
                ),
              })
            }
            className={`w-full rounded-lg border-2 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
              errors.quantity ? 'border-red-500 bg-gray-900' : 'border-gray-700 bg-gray-800'
            }`}
            placeholder="1"
            required
          />
          {errors.quantity && <p className="mt-1 text-sm text-red-400">{errors.quantity}</p>}
          <p className="mt-1 text-xs text-gray-500">
            Creates one inventory item per case or sticker selected.
          </p>
        </div>
      )}
    </div>
  );
}


