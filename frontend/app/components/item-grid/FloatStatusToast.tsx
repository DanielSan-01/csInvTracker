type FloatStatusSummary = {
  active: boolean;
  label: string;
  queued: number;
  imageUrl?: string;
  exterior?: string;
  waiting: boolean;
  retrySeconds: number | null;
  message: string | null;
};

type FloatStatusToastProps = {
  summary: FloatStatusSummary;
};

export default function FloatStatusToast({ summary }: FloatStatusToastProps) {
  if (!summary.active) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-50 max-w-xs rounded-2xl border border-sky-400/20 bg-gray-950/95 px-4 py-3 shadow-xl shadow-black/60 backdrop-blur"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3">
        {summary.imageUrl ? (
          <img
            src={summary.imageUrl}
            alt={summary.label}
            className="h-14 w-14 flex-none rounded-xl border border-white/10 object-cover shadow-inner shadow-black/40"
          />
        ) : (
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-[0.65rem] font-semibold uppercase tracking-wide text-sky-200">
            Float
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wide text-sky-300/80">
            <span className="inline-flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${summary.waiting ? 'bg-amber-400 animate-pulse' : 'bg-sky-400 animate-pulse'}`}
              />
              {summary.waiting ? 'Waiting on rate limit' : 'Fetching floats'}
            </span>
            {summary.queued > 0 && <span className="text-gray-400">{summary.queued} queued</span>}
            {summary.waiting && summary.retrySeconds !== null && (
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[0.65rem] text-sky-200">
                {summary.retrySeconds}s
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-white">{summary.label}</p>
          {summary.exterior && <p className="text-xs uppercase tracking-wide text-gray-400">{summary.exterior}</p>}
          {summary.message && <p className="mt-1 text-xs text-gray-400">{summary.message}</p>}
        </div>
      </div>
    </div>
  );
}
