'use client';

import { useState, useEffect } from 'react';
import { stickersApi, StickerCatalogDto } from '@/lib/api';

export function useStickerCatalog(searchTerm: string = '') {
  const [stickers, setStickers] = useState<StickerCatalogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStickers = async () => {
      // Don't search if term is too short
      if (searchTerm.length > 0 && searchTerm.length < 2) {
        setStickers([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await stickersApi.getStickers(searchTerm || undefined);
        setStickers(data.slice(0, 50));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stickers');
        console.error('[useStickerCatalog] Error fetching stickers:', err);
        setStickers([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchStickers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return { stickers, loading, error };
}











