import type { LoadoutDto } from '@/lib/api';

type SaveLoadoutModalProps = {
  name: string;
  error?: string | null;
  isSaving?: boolean;
  existingLoadouts: LoadoutDto[];
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSave: (loadoutId?: string) => void;
  onLoad: (loadout: LoadoutDto) => void;
};

export default function SaveLoadoutModal({
  name,
  error = null,
  isSaving = false,
  existingLoadouts,
  onNameChange,
  onClose,
  onSave,
  onLoad,
}: SaveLoadoutModalProps) {
  const maxLoadouts = 2;
  const canSaveNew = existingLoadouts.length < maxLoadouts;
  const loadoutsToShow = existingLoadouts.slice(0, maxLoadouts);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-purple-500 bg-gray-950 p-6 shadow-2xl shadow-purple-900/40"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white">Save Loadout</h3>
        <p className="mt-2 text-sm text-gray-400">
          {canSaveNew
            ? 'Save your current loadout to a slot or load an existing one.'
            : 'You have 2 saved loadouts. Select one to overwrite or load an existing loadout.'}
        </p>

        {/* Existing Loadouts */}
        {loadoutsToShow.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-purple-200">
              Saved Loadouts ({loadoutsToShow.length}/{maxLoadouts})
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              {loadoutsToShow.map((loadout, index) => (
                <div
                  key={loadout.id}
                  className="group relative rounded-xl border border-purple-500/30 bg-gray-900/60 p-4 transition hover:border-purple-400/60 hover:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-200">
                          Slot {index + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(loadout.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h5 className="text-sm font-semibold text-white">{loadout.name}</h5>
                      <p className="mt-1 text-xs text-gray-400">
                        {loadout.entries.length} items
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => onLoad(loadout)}
                      className="flex-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-200 transition hover:border-purple-400/60 hover:bg-purple-500/20"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => onSave(loadout.id)}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-purple-400/40 hover:text-purple-200"
                    >
                      Overwrite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save New Loadout Form */}
        {canSaveNew && (
          <div className="mt-6 space-y-3 border-t border-gray-800 pt-6">
            <label className="block text-xs uppercase tracking-wide text-purple-200">
              Save to Slot {existingLoadouts.length + 1}
            </label>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={`e.g. CT Mirage Default`}
              className="w-full rounded-xl border border-purple-500/40 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={() => onSave()}
              disabled={isSaving}
              className={`w-full rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isSaving
                  ? 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
                  : 'border border-purple-500/60 bg-purple-500/20 text-purple-100 hover:border-purple-400/70 hover:bg-purple-500/30'
              }`}
            >
              {isSaving ? 'Saving...' : `Save to Slot ${existingLoadouts.length + 1}`}
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition hover:border-purple-400/40 hover:text-purple-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
