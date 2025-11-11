'use client';

import { useState, useEffect } from 'react';
import { skinsApi, SkinDto } from '@/lib/api';
import { expandSearchTerm, scoreMatch } from '@/lib/searchShorthands';

export function useSkinCatalog(searchTerm: string = '') {
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
        
        // Expand shorthands (e.g., "bfk doppler ph4" → "Butterfly Doppler Phase 4")
        const expandedTerms = expandSearchTerm(searchTerm);
        console.log(`[useSkinCatalog] Original: "${searchTerm}"`);
        console.log(`[useSkinCatalog] Expanded to: [${expandedTerms.join(', ')}]`);
        
        // Try each expanded term and collect all results
        const allResults = new Map<number, SkinDto>();
        
        for (const term of expandedTerms) {
          const data = await skinsApi.getSkins(term || undefined);
          // Add to results map (deduplicates by ID)
          data.forEach(skin => {
            if (!allResults.has(skin.id)) {
              allResults.set(skin.id, skin);
            }
          });
        }
        
        // Convert to array and sort by relevance
        const results = Array.from(allResults.values());
        results.sort((a, b) => {
          const scoreA = scoreMatch(searchTerm, a.name);
          const scoreB = scoreMatch(searchTerm, b.name);
          return scoreB - scoreA;
        });
        
        console.log(`[useSkinCatalog] Found ${results.length} unique results`);
        setSkins(results.slice(0, 50)); // Limit to top 50
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch skins');
        console.error('[useSkinCatalog] Error fetching skins:', err);
        setSkins([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(fetchSkins, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return { skins, loading, error };
}

