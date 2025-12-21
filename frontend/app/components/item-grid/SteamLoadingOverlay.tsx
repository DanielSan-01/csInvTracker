export default function SteamLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-gray-950/85 backdrop-blur-sm">
      <svg className="h-10 w-10 animate-spin text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V1.5A10.5 10.5 0 002.5 12H4zm2 5.291A7.962 7.962 0 014 12H2.5c0 3.31 1.344 6.31 3.52 8.477L6 17.291z"
        />
      </svg>
      <div className="text-sm font-medium text-blue-200">Loading inventory from Steam…</div>
      <p className="text-xs text-gray-400">This may take a moment if you have a large inventory.</p>
    </div>
  );
}










