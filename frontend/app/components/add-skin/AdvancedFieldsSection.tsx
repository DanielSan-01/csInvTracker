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

        <div className="md:col-span-2">
          <label className="mb-3 block text-sm font-medium text-gray-300">
            Trade Lock Duration
          </label>
          <div className="grid grid-cols-8 gap-2">
            {/* None option */}
            <label
              className={`flex flex-col items-center justify-center rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
                !formData.tradeLockDays || formData.tradeLockDays === 0
                  ? 'border-purple-400 bg-purple-500/10 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name="tradeLockDays"
                value="0"
                checked={!formData.tradeLockDays || formData.tradeLockDays === 0}
                onChange={() => {
                  onChange({
                    tradeProtected: false,
                    tradeLockDays: undefined,
                  });
                }}
                className="sr-only"
              />
              <span>None</span>
            </label>
            {[1, 2, 3, 4, 5, 6, 7].map((days) => (
              <label
                key={days}
                className={`flex flex-col items-center justify-center rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
                  formData.tradeLockDays === days
                    ? 'border-purple-400 bg-purple-500/10 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
          <input
                  type="radio"
                  name="tradeLockDays"
                  value={days}
                  checked={formData.tradeLockDays === days}
                  onChange={() => {
              onChange({
                      tradeProtected: days > 0,
                      tradeLockDays: days,
                    });
                  }}
                  className="sr-only"
                />
                <span>{days}</span>
                <span className="text-xs text-gray-500">day{days !== 1 ? 's' : ''}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Select trade lock duration (1-7 days) or None for no trade lock.
          </p>
        </div>
      </div>
    </div>
  );
}

