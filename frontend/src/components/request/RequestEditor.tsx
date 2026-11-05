import { useState } from 'react';
import { HTTP_METHODS } from '../../lib/factories';
import { PANEL_TITLES, isRequestPart } from '../../lib/panels';
import type { RequestPart, SavedRequest } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { REQUEST_PART_EDITORS } from './RequestParts';

type SubTab = RequestPart | 'pre' | 'post';

interface RequestEditorProps {
  request: SavedRequest;
  loading: boolean;
  error: string;
  /** Partes abertas como painéis próprios (somem das sub-abas). */
  detachedParts: RequestPart[];
  onDetach: (part: RequestPart) => void;
  onChange: (changes: Partial<SavedRequest>) => void;
  onSend: () => void;
}

function countEnabled(rows: SavedRequest['params']) {
  return rows.filter((r) => r.enabled && r.key.trim()).length;
}

export function RequestEditor({
  request,
  loading,
  error,
  detachedParts,
  onDetach,
  onChange,
  onSend,
}: RequestEditorProps) {
  const [selected, setSelected] = useState<SubTab>('params');

  const subTabs = (
    [
      { id: 'params', label: PANEL_TITLES.params, badge: countEnabled(request.params) },
      { id: 'auth', label: PANEL_TITLES.auth },
      { id: 'headers', label: PANEL_TITLES.headers, badge: countEnabled(request.headers) },
      { id: 'body', label: PANEL_TITLES.body },
      { id: 'pre', label: 'Pré-processamento' },
      { id: 'post', label: 'Pós-processamento' },
    ] as Array<{ id: SubTab; label: string; badge?: number }>
  ).filter((t) => !(isRequestPart(t.id) && detachedParts.includes(t.id)));

  // Se a sub-aba selecionada foi destacada, mostra a primeira que sobrou.
  const tab = subTabs.some((t) => t.id === selected) ? selected : subTabs[0]?.id;

  const renderTab = () => {
    if (!tab) return <EmptyState icon="⇱" title="Todas as partes estão destacadas em painéis" />;
    if (isRequestPart(tab)) {
      const Editor = REQUEST_PART_EDITORS[tab];
      return <Editor request={request} onChange={onChange} />;
    }
    const field = tab === 'pre' ? 'preScript' : 'postScript';
    return (
      <textarea
        className="code-input"
        value={request[field]}
        spellCheck={false}
        placeholder={
          tab === 'pre'
            ? '// JavaScript executado antes da requisição (salvo com a requisição; execução ainda não suportada)'
            : '// Testes executados após a resposta (salvo com a requisição; execução ainda não suportada)'
        }
        onChange={(event) => onChange({ [field]: event.target.value })}
      />
    );
  };

  return (
    <form
      className="request-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (!loading) onSend();
      }}
    >
      <div className="urlrow">
        <select
          aria-label="Método HTTP"
          value={request.method}
          onChange={(event) => onChange({ method: event.target.value })}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input
          aria-label="URL"
          value={request.url}
          placeholder="https://api.exemplo.com/recurso  ou  /recurso  ou  {{base_url}}/recurso"
          spellCheck={false}
          onChange={(event) => onChange({ url: event.target.value })}
        />
        <button className="primary send" type="submit" disabled={loading}>
          {loading ? 'Enviando…' : '➤ Enviar'}
        </button>
      </div>

      {error && (
        <div className="inline-error" role="alert">
          ⚠ {error}
        </div>
      )}

      <div className="subtabs" role="tablist">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setSelected(t.id)}
          >
            {t.label}
            {Boolean(t.badge) && <sup className="badge">{t.badge}</sup>}
          </button>
        ))}
        {tab && isRequestPart(tab) && (
          <button
            type="button"
            className="detach"
            onClick={() => onDetach(tab)}
            title={`Abrir ${PANEL_TITLES[tab]} em um painel próprio`}
            aria-label={`Destacar ${PANEL_TITLES[tab]}`}
          >
            ⇱
          </button>
        )}
      </div>

      <div className="tabcontent">{renderTab()}</div>
    </form>
  );
}
