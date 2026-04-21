import { useCallback, useEffect, useState } from 'react';

export type SearchLog = {
  query: string;
  mode: 'basic' | 'advanced';
  searchIn: string[];
  refineWithin?: string;
  timestamp: number;
};

const STORAGE_KEY = 'explore-search-history';
const MAX_ENTRIES = 20;

function readStorage(): SearchLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SearchLog =>
        !!e &&
        typeof e === 'object' &&
        typeof e.query === 'string' &&
        typeof e.timestamp === 'number'
    );
  } catch {
    return [];
  }
}

function writeStorage(entries: SearchLog[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore quota/serialization errors; history is best-effort.
  }
}

function dedupeKey(entry: Pick<SearchLog, 'query' | 'refineWithin'>): string {
  return `${entry.query.trim().toLowerCase()}|${(entry.refineWithin || '').trim().toLowerCase()}`;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchLog[]>(() => readStorage());

  // Keep state in sync when another tab/window updates the log.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHistory(readStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const addEntry = useCallback((entry: Omit<SearchLog, 'timestamp'> & { timestamp?: number }) => {
    const trimmed = entry.query.trim();
    if (!trimmed) return;
    const newEntry: SearchLog = {
      query: trimmed,
      mode: entry.mode,
      searchIn: [...entry.searchIn],
      refineWithin: entry.refineWithin?.trim() || undefined,
      timestamp: entry.timestamp ?? Date.now(),
    };
    setHistory((prev) => {
      const key = dedupeKey(newEntry);
      const filtered = prev.filter((e) => dedupeKey(e) !== key);
      const next = [newEntry, ...filtered].slice(0, MAX_ENTRIES);
      writeStorage(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((timestamp: number) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.timestamp !== timestamp);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    writeStorage([]);
  }, []);

  return { history, addEntry, removeEntry, clear };
}
