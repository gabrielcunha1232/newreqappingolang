import { methodClass, methodShort, statusClass } from '../../lib/format';
import type { HistoryEntry } from '../../types';

interface HistoryListProps {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function HistoryList({ entries, onOpen, onClear }: HistoryListProps) {
  return (
    <>
      <div className="tree">
        {entries.length === 0 && (
          <div className="tree-empty">As requisições enviadas aparecerão aqui.</div>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            role="button"
            tabIndex={0}
            className="tree-item history-item"
            title={entry.url}
            onClick={() => onOpen(entry)}
            onKeyDown={(event) => event.key === 'Enter' && onOpen(entry)}
          >
            <span className={methodClass(entry.method)}>{methodShort(entry.method)}</span>
            <span className="tree-label">{entry.url}</span>
            <span className={'history-status ' + statusClass(entry.status)}>{entry.status}</span>
            <span className="history-time">
              {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
      <div className="side-bottom">
        <button onClick={onClear} disabled={entries.length === 0}>
          Limpar histórico
        </button>
      </div>
    </>
  );
}
