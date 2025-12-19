type DetailActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function DetailActions({ onEdit, onDelete }: DetailActionsProps) {
  if (!onEdit && !onDelete) {
    return null;
  }

  return (
    <div className="flex justify-end gap-2 pt-2">
      {onEdit && (
        <button
          onClick={onEdit}
          aria-label="Edit item"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-200 transition-colors hover:bg-blue-500/20"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete item"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-200 transition-colors hover:bg-rose-500/20"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-6 4h8m-1 0v10m-6-10v10"
            />
          </svg>
        </button>
      )}
    </div>
  );
}









