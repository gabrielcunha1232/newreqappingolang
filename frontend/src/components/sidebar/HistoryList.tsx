import { useMemo, useState } from 'react';
import { useContextMenu } from '../../hooks/useContextMenu';
import { methodClass, methodShort, statusClass } from '../../lib/format';
import { filterHistory, groupHistoryByDay } from '../../lib/historyView';
import { tryParseJson } from '../../lib/json';
import type { HistoryEntry } from '../../types';
import { ContextMenu, MenuItem, MenuSeparator } from '../common/ContextMenu';
import { Modal } from '../common/Modal';
import { JsonCode } from '../response/JsonCode';

const STATUS_GROUPS = ['2xx', '3xx', '4xx', '5xx'];

interface HistoryListProps {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  /** Cria uma requisição nova mesmo que a original ainda exista. */
  onOpenAsNew: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onCopyText: (text: string, label: string) => void;
  onClear: () => void;
}

function ResponseDialog({ entry, onClose }: { entry: HistoryEntry; onClose: () => void }) {
  const parsed = tryParseJson(entry.body ?? '');
  const text = parsed.ok ? JSON.stringify(parsed.value, null, 2) : entry.body ?? '';
  return (
    <Modal title={`${entry.method} · ${entry.status} · ${new Date(entry.timestamp).toLocaleString('pt-BR')}`} width={760} onClose={onClose}>
      <div className="history-response">
        <p className="hint">{entry.url}</p>
        {text ? <JsonCode text={text} highlight={parsed.ok} /> : <p className="muted">Corpo vazio.</p>}
      </div>
    </Modal>
  );
}

export function HistoryList({ entries, onOpen, onOpenAsNew, onRemove, onCopyText, onClear }: HistoryListProps) {
  const { menu, openAt, close } = useContextMenu<HistoryEntry>();
  const [term, setTerm] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [viewing, setViewing] = useState<HistoryEntry | null>(null);

  const methods = useMemo(() => [...new Set(entries.map((entry) => entry.method.toUpperCase()))].sort(), [entries]);
  const groups = useMemo(() => groupHistoryByDay(filterHistory(entries, { term, method, status })), [entries, term, method, status]);

  return (
    <>
      <div className="side-tools history-filters">
        <input placeholder="⌕  Filtrar por URL..." aria-label="Filtrar histórico por URL" value={term} onChange={(event) => setTerm(event.target.value)} />
        <select aria-label="Filtrar por método" value={method} onChange={(event) => setMethod(event.target.value)}>
          <option value="">Método</option>
          {methods.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select aria-label="Filtrar por status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Status</option>
          {STATUS_GROUPS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="tree">
        {entries.length === 0 && <div className="tree-empty">As requisições enviadas aparecerão aqui.</div>}
        {entries.length > 0 && groups.length === 0 && <div className="tree-empty">Nada encontrado com esses filtros.</div>}
        {groups.map((group) => (
          <section key={group.label}>
            <h4 className="history-day">{group.label}</h4>
            {group.entries.map((entry) => (
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
          </section>
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
          <MenuItem disabled={menu.target.body === undefined} onSelect={() => setViewing(menu.target)}>
            Ver resposta
          </MenuItem>
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
      {viewing && <ResponseDialog entry={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
