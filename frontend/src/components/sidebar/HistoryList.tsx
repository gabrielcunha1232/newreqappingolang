import { useContextMenu } from '../../hooks/useContextMenu';
import { methodClass, methodShort, statusClass } from '../../lib/format';
import type { HistoryEntry } from '../../types';
import { ContextMenu, MenuItem, MenuSeparator } from '../common/ContextMenu';

interface HistoryListProps {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  /** Cria uma requisição nova mesmo que a original ainda exista. */
  onOpenAsNew: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onCopyText: (text: string, label: string) => void;
  onClear: () => void;
}

export function HistoryList({ entries, onOpen, onOpenAsNew, onRemove, onCopyText, onClear }: HistoryListProps) {
  const { menu, openAt, close } = useContextMenu<HistoryEntry>();

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
            onContextMenu={(event) => openAt(event, entry)}
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

      {menu && (
        <ContextMenu position={menu.position} onClose={close}>
          <MenuItem onSelect={() => onOpen(menu.target)}>Abrir</MenuItem>
          <MenuItem onSelect={() => onOpenAsNew(menu.target)}>Abrir como nova requisição</MenuItem>
          <MenuItem onSelect={() => onCopyText(menu.target.url, 'URL')}>Copiar URL</MenuItem>
          <MenuSeparator />
          <MenuItem danger onSelect={() => onRemove(menu.target.id)}>
            Remover do histórico
          </MenuItem>
          <MenuItem danger onSelect={onClear}>
            Limpar histórico
          </MenuItem>
        </ContextMenu>
      )}
    </>
  );
}
