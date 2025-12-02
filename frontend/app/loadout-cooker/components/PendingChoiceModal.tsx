import TeamIcon from './TeamIcon';
import type { PendingChoice } from '../types';

type PendingChoiceModalProps = {
  choice: PendingChoice;
  onSelect: (inventoryId: number) => void;
  onSkip: () => void;
};

export default function PendingChoiceModal({ choice, onSelect, onSkip }: PendingChoiceModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onSkip}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-purple-500 bg-gray-950 p-6 shadow-2xl shadow-purple-900/40"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white">
          <span className="flex items-center gap-2">
            <TeamIcon team={choice.team} />
            Select {choice.slot.label} for {choice.team} side
          </span>
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          Choose which inventory item should be equipped on the {choice.team} side.
        </p>
        <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
          {choice.options.map((option) => (
            <button
              key={`${choice.slot.key}-${choice.team}-${option.inventoryId}`}
              onClick={() => onSelect(option.inventoryId)}
              className="flex w-full items-center gap-3 rounded-xl border border-purple-500/30 bg-gray-900/60 p-3 text-left transition hover:border-purple-400 hover:bg-gray-900"
            >
              {option.skin.imageUrl ? (
                <img
                  src={option.skin.imageUrl}
                  alt={option.skin.name}
                  className="h-12 w-12 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-purple-500/30 bg-gray-900 text-xs text-purple-200">
                  No Image
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white line-clamp-2">
                  {option.skin.name}
                </span>
                {option.skin.collection && (
                  <span className="text-xs text-gray-400">{option.skin.collection}</span>
                )}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onSkip}
          className="mt-4 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition hover:border-purple-400/40 hover:text-purple-200"
        >
          Skip this slot for now
        </button>
      </div>
    </div>
  );
}


