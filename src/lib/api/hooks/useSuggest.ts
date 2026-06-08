import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getSuggestions } from '../services/searchService';
import type { SuggestResponse } from '../types';

/** Debounce a fast-changing value (keystrokes) so we don't fire a request per character. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Blended typeahead hook.
 * - ~120ms debounce on keystrokes.
 * - React Query passes an AbortSignal to the fetch so stale keystrokes are cancelled.
 * - keepPreviousData avoids dropdown flicker while the next page of suggestions loads.
 * - Disabled for empty / very short queries.
 */
export function useSuggest(
  query: string,
  options?: { enabled?: boolean; limit?: number; debounceMs?: number }
) {
  const debounceMs = options?.debounceMs ?? 120;
  const limit = options?.limit ?? 8;
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, debounceMs);
  const enabled = options?.enabled !== false && debounced.length >= 2;

  return useQuery<SuggestResponse, Error>({
    queryKey: ['suggest', debounced, limit],
    queryFn: ({ signal }) => getSuggestions(debounced, limit, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60, // suggestions are stable for ~1 min (matches backend cache)
    gcTime: 1000 * 120,
    retry: false,
  });
}
