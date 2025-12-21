import type { CSItem } from '@/lib/mockData';

type DeleteConfirmationModalProps = {
  item: CSItem;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
};

export default function DeleteConfirmationModal({
  item,
  onCancel,
  onConfirm,
  isDeleting,
}: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-gray-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-red-500/40 bg-gray-900/95 p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-red-200">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <h3 className="text-lg font-semibold">Delete item?</h3>
        </div>
        <p className="text-sm text-gray-300">
          Are you sure you want to remove{' '}
          <span className="font-medium text-white">{item.name}</span> from your inventory? This
          action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-800 disabled:opacity-60"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            disabled={isDeleting}
          >
            {isDeleting && (
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V2.5A9.5 9.5 0 003.5 12H4zm2 5.291A7.962 7.962 0 014 12H2.5c0 3.31 1.344 6.31 3.52 8.477L6 17.291z"
                />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}










