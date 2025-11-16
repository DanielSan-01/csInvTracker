'use client';

import { useState, useEffect, useMemo } from 'react';
import { skinsApi, SkinDto } from '@/lib/api';
import { expandSearchTerm, scoreMatch } from '@/lib/searchShorthands';

export function useSkinCatalog(searchTerm: string = '', initialName?: string) {
  const [skins, setSkins] = useState<SkinDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkins = async () => {
      // Don't search if term is too short
      if (searchTerm.length > 0 && searchTerm.length < 2) {
        setSkins([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const expandedTerms = expandSearchTerm(searchTerm);
        console.log(`[useSkinCatalog] Original: "${searchTerm}"`);
        console.log(`[useSkinCatalog] Expanded to: [${expandedTerms.join(', ')}]`);

        const allResults = new Map<number, SkinDto>();

        for (const term of expandedTerms) {
          const data = await skinsApi.getSkins(term || undefined);
          data.forEach(skin => {
            if (!allResults.has(skin.id)) {
              allResults.set(skin.id, skin);
            }
          });
        }

        const results = Array.from(allResults.values());
        results.sort((a, b) => {
          const scoreA = scoreMatch(searchTerm, a.name);
          const scoreB = scoreMatch(searchTerm, b.name);
          return scoreB - scoreA;
        });

        console.log(`[useSkinCatalog] Found ${results.length} unique results`);
        setSkins(results.slice(0, 50));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch skins');
        console.error('[useSkinCatalog] Error fetching skins:', err);
        setSkins([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSkins, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const selectedSkin = useMemo(() => {
    if (!initialName) return null;
    const normalized = initialName.toLowerCase();
    let match =
      skins.find(skin => skin.name.toLowerCase() === normalized) ||
      skins.find(skin => skin.name.toLowerCase().startsWith(normalized));
    if (match) return match;
    match = skins.find(skin => normalized.includes(skin.name.toLowerCase()));
    return match ?? null;
  }, [skins, initialName]);

  return { skins, loading, error, selectedSkin };
}

