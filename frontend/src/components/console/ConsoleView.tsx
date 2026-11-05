import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../../types';

const LEVEL_ICON: Record<LogEntry['level'], string> = {
  info: 'ⓘ',
  ok: '✓',
  warn: '⚠',
  error: '✕',
};

interface ConsoleViewProps {
  entries: LogEntry[];
  onClear: () => void;
  onSave: () => void;
}

export function ConsoleView({ entries, onClear, onSave }: ConsoleViewProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [entries, autoScroll]);

  return (
    <div className="console">
      <div className="console-lines">
        {entries.length === 0 && <div className="hint">Nenhum log ainda.</div>}
        {entries.map((entry) => (
          <div key={entry.id}>
            <span className={entry.level}>{LEVEL_ICON[entry.level]}</span> [{entry.time}] {entry.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="console-actions">
        <span>
          <button className="link" onClick={onClear}>
            ▤ Limpar
          </button>
          <button className="link" onClick={onSave} disabled={entries.length === 0}>
            ⇩ Salvar logs
          </button>
        </span>
        <label className="toggle">
          <input type="checkbox" checked={autoScroll} onChange={(event) => setAutoScroll(event.target.checked)} />
          Auto-scroll
        </label>
      </div>
    </div>
  );
}
