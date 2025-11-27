type SaveLoadoutModalProps = {
  name: string;
  error?: string | null;
  isSaving?: boolean;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function SaveLoadoutModal({
  name,
  error = null,
  isSaving = false,
  onNameChange,
  onClose,
  onSave,
}: SaveLoadoutModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-purple-500 bg-gray-950 p-6 shadow-2xl shadow-purple-900/40"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white">Save Loadout</h3>
        <p className="mt-2 text-sm text-gray-400">
          Give this loadout a friendly name so you can favorite it for later.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs uppercase tracking-wide text-purple-200">
            Loadout Name
          </label>
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g. CT Mirage Default"
            className="w-full rounded-xl border border-purple-500/40 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition hover:border-purple-400/40 hover:text-purple-200"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isSaving
                ? 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
                : 'border border-purple-500/60 bg-purple-500/20 text-purple-100 hover:border-purple-400/70 hover:bg-purple-500/30'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Loadout'}
          </button>
        </div>
      </div>
    </div>
  );
}

