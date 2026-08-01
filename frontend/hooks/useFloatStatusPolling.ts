'use client';

import { useEffect, useState } from 'react';
import { FloatStatus } from '@/lib/api';

export function useFloatStatusPolling() {
  const [floatStatus, setFloatStatus] = useState<FloatStatus | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let api: typeof import('@/lib/api').steamInventoryApi | null = null;

    const shouldKeepPolling = (status: FloatStatus) =>
      status.isProcessing || status.pending > 0 || !!status.waitingForRateLimit;

    const pollOnce = async (): Promise<FloatStatus | null> => {
      try {
        if (!api) {
          ({ steamInventoryApi: api } = await import('@/lib/api'));
        }
        if (!api) {
          return null;
        }

        const status = await api.getFloatStatus();
        if (!isMounted) {
          return null;
        }
        setFloatStatus(status);

        // Stop polling automatically when there is no active work.
        if (!shouldKeepPolling(status) && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }

        return status;
      } catch (err) {
        if (!isMounted) {
          return null;
        }
        console.debug('[useFloatStatusPolling] Failed to fetch float status', err);
        return null;
      }
    };

    const startPolling = async () => {
      const status = await pollOnce();

      // Only start interval if there is active work (queue or rate-limit wait) based on latest status.
      if (!intervalId && status && shouldKeepPolling(status)) {
        intervalId = setInterval(pollOnce, 2000);
      }
    };

    startPolling();

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return { floatStatus };
}
