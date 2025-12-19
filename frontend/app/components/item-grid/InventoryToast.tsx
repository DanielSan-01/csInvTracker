import type { ToastState } from './useToast';

type InventoryToastProps = {
  toast: ToastState | null;
};

export default function InventoryToast({ toast }: InventoryToastProps) {
  if (!toast) return null;

  const intentStyles =
    toast.type === 'success'
      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
      : toast.type === 'error'
      ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
      : 'border-blue-400/40 bg-blue-500/15 text-blue-200';

  return (
    <div className="fixed left-1/2 top-6 z-[60] w-full max-w-lg -translate-x-1/2 px-4">
      <div
        className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-opacity ${intentStyles}`}
      >
        {toast.message}
      </div>
    </div>
  );
}









