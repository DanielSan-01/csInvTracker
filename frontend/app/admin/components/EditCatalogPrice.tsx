import { useState, useMemo } from 'react';
import { adminApi, type SkinDto } from '@/lib/api';
import { useSkinCatalog } from '@/hooks/useSkinCatalog';

type EditCatalogPriceProps = {
  onUpdated?: () => void;
};

export default function EditCatalogPrice({ onUpdated }: EditCatalogPriceProps) {
  const [search, setSearch] = useState('');
  const { skins, loading } = useSkinCatalog(search);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedSkin: SkinDto | null = useMemo(() => {
    if (selectedId == null) return null;
    return skins.find((s) => s.id === selectedId) ?? null;
  }, [selectedId, skins]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    const skin = skins.find((s) => s.id === id);
    const existingPrice = skin?.defaultPrice;
    setPriceInput(existingPrice != null ? existingPrice.toString() : '');
    setStatus(null);
  };

  const handleSave = async () => {
    if (!selectedSkin) {
      setStatus({ type: 'error', message: 'Select a skin first.' });
      return;
    }
    const trimmed = priceInput.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (value != null && (isNaN(value) || value < 0)) {
      setStatus({ type: 'error', message: 'Price must be a non-negative number or empty to clear.' });
      return;
    }

    try {
      setSaving(true);
      setStatus(null);
      await adminApi.updateSkinPrice(selectedSkin.id, value);
      setStatus({ type: 'success', message: 'Catalog price updated.' });
      if (onUpdated) onUpdated();
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update price.' });
    } finally {
      setSaving(false);
    }
  };

  const clearSelection = () => {
    setSelectedId(null);
    setPriceInput('');
    setStatus(null);
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">Edit Catalog Price</h3>
        <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Admin only</span>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Find skin</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalog (e.g., Butterfly, Pandora)"
            className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {loading && <p className="mt-2 text-xs text-gray-400">Searching...</p>}
          {!loading && skins.length > 0 && (
            <select
              className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              size={Math.min(6, skins.length)}
              value={selectedId ?? undefined}
              onChange={(e) => handleSelect(Number(e.target.value))}
            >
              {skins.map((skin) => (
                <option key={skin.id} value={skin.id}>
                  {skin.name} {skin.defaultPrice != null ? `• $${skin.defaultPrice.toFixed(2)}` : '• no price'}
                </option>
              ))}
            </select>
          )}
          {!loading && search.length >= 2 && skins.length === 0 && (
            <p className="mt-2 text-xs text-gray-400">No results.</p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="block text-sm font-medium text-gray-300">Catalog price (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder={selectedSkin?.defaultPrice != null ? selectedSkin.defaultPrice.toString() : 'e.g., 50.00'}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={!selectedSkin}
            />
            <p className="mt-1 text-xs text-gray-400">Leave empty and save to clear.</p>
          </div>
          <div className="flex flex-col gap-2 md:items-end md:justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedSkin || saving}
              className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {saving ? 'Saving...' : 'Save price'}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="w-full rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700 md:w-auto"
            >
              Clear selection
            </button>
          </div>
        </div>

        {status && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              status.type === 'success'
                ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border border-red-500/40 bg-red-500/10 text-red-200'
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}


