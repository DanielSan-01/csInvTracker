'use client';

type GoalActionSectionProps = {
  formError: string | null;
  onSubmit: () => void;
  isSaving: boolean;
  canSubmit: boolean;
};

const GoalActionSection = ({ formError, onSubmit, isSaving, canSubmit }: GoalActionSectionProps) => {
  return (
    <section className="space-y-4 rounded-3xl border border-gray-800/60 bg-gray-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
      {formError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {formError}
        </div>
      )}

      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="text-xs text-gray-500">
          We’ll store your goal locally on this device so you can revisit it later.
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-500/60"
        >
          {isSaving ? (
            <>
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V2.5A9.5 9.5 0 003.5 12H4zm2 5.291A7.962 7.962 0 014 12H2.5c0 3.31 1.344 6.31 3.52 8.477L6 17.291z"
                />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Goal
            </>
          )}
        </button>
      </div>
    </section>
  );
};

export default GoalActionSection;


