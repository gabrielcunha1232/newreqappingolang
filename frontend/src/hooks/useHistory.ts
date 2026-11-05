import { useCallback, useState } from 'react';
import { generateId } from '../lib/id';
import type { HistoryEntry } from '../types';

const MAX_ENTRIES = 100;

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const add = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setEntries((prev) =>
      [{ ...entry, id: generateId(), timestamp: new Date().toISOString() }, ...prev].slice(0, MAX_ENTRIES)
    );
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, actions: { hydrate: setEntries, add, clear } };
}
