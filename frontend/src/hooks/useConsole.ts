import { useCallback, useState } from 'react';
import { formatClock } from '../lib/format';
import { generateId } from '../lib/id';
import type { LogEntry, LogLevel } from '../types';

const MAX_LINES = 500;

export function useConsole() {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const log = useCallback((level: LogLevel, message: string) => {
    setEntries((prev) =>
      [...prev, { id: generateId(), level, time: formatClock(), message }].slice(-MAX_LINES)
    );
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, log, clear };
}

export type Logger = ReturnType<typeof useConsole>['log'];
