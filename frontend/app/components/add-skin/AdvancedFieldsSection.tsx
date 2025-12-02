import type { NewSkinData } from './types';

type AdvancedFieldsSectionProps = {
  formData: NewSkinData;
  errors: Record<string, string>;
  onChange: (updates: Partial<NewSkinData>) => void;
};

export default function AdvancedFieldsSection({
  formData,
  errors,
  onChange,
}: AdvancedFieldsSectionProps) {
  return (
    <div className="animate-fadeIn space-y-4 border-t border-gray-700 pt-4">
      <h3 className="border-b border-gray-700 pb-2 text-lg font-semibold text-gray-400">
        Optional Information
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Float Value (0.0 - 1.0)
          </label>
          <input
            type="number"
            step="0.0000001"
            min="0"
            max="1"
            value={formData.float ?? ''}
            onChange={(event) =>
              onChange({
                float: event.target.value ? parseFloat(event.target.value) : undefined,
              })
            }
            className={`w-full rounded-lg border-2 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
              errors.float ? 'border-red-500 bg-gray-900' : 'border-gray-700 bg-gray-800'
            }`}
            placeholder="e.g., 0.564978"
          />
          {errors.float && <p className="mt-1 text-sm text-red-400">{errors.float}</p>}
          <p className="mt-1 text-xs text-gray-500">
            Leave empty if unknown. Float determines wear condition.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Paint Seed</label>
          <input
            type="number"
            min="0"
            value={formData.paintSeed ?? ''}
            onChange={(event) =>
              onChange({
                paintSeed: event.target.value ? parseInt(event.target.value, 10) : undefined,
              })
            }
            className={`w-full rounded-lg border-2 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
              errors.paintSeed ? 'border-red-500 bg-gray-900' : 'border-gray-700 bg-gray-800'
            }`}
            placeholder="e.g., 396"
          />
          {errors.paintSeed && (
            <p className="mt-1 text-sm text-red-400">{errors.paintSeed}</p>
          )}
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

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-300">Image URL</label>
          <input
            type="url"
            value={formData.imageUrl ?? ''}
            onChange={(event) =>
              onChange({
                imageUrl: event.target.value || undefined,
              })
            }
            className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            placeholder="https://example.com/image.jpg"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to auto-generate placeholder
          </p>
        </div>

        <div className="md:col-span-2 flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3">
          <input
            type="checkbox"
            id="tradeProtected"
            checked={Boolean(formData.tradeProtected)}
            onChange={(event) =>
              onChange({
                tradeProtected: event.target.checked || undefined,
              })
            }
            className="h-5 w-5 rounded border-gray-700 bg-gray-800 text-purple-500 focus:ring-purple-500"
          />
          <label htmlFor="tradeProtected" className="text-sm font-medium text-gray-300">
            Item is trade protected (set trade lock reminder)
          </label>
        </div>
      </div>
    </div>
  );
}

