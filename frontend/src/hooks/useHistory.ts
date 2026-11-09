import { useCallback, useState } from 'react';
import { generateId } from '../lib/id';
import { MAX_HISTORY_BODY, capHistoryBodies } from '../lib/responseStore';
import type { HistoryEntry } from '../types';

const MAX_ENTRIES = 100;

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const add = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const body = entry.body !== undefined && entry.body.length <= MAX_HISTORY_BODY ? entry.body : undefined;
    setEntries((prev) =>
      capHistoryBodies([{ ...entry, body, id: generateId(), timestamp: new Date().toISOString() }, ...prev].slice(0, MAX_ENTRIES))
    );
  }, []);

  const remove = useCallback((id: string) => setEntries((prev) => prev.filter((e) => e.id !== id)), []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, actions: { hydrate: setEntries, add, remove, clear } };
}
