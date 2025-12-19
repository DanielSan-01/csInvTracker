import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastIntent = 'success' | 'error' | 'info';

export type ToastState = {
  message: string;
  type: ToastIntent;
};

export function useToast(durationMs = 4000) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastIntent = 'info') => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setToast({ message, type });
      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, durationMs);
    },
    [durationMs]
  );

  useEffect(() => () => clearToast(), [clearToast]);

  return { toast, showToast, clearToast };
}









