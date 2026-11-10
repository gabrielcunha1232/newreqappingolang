import { useState } from 'react';
import { looksLikeCurl } from '../../lib/curl/parseCurl';
import { HTTP_METHODS } from '../../lib/factories';
import { PANEL_TITLES, isRequestPart } from '../../lib/panels';
import type { RequestPart, SavedRequest } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { REQUEST_PART_EDITORS } from './RequestParts';
import { ScriptEditor } from './ScriptEditor';

type SubTab = RequestPart | 'pre' | 'post';

interface RequestEditorProps {
  request: SavedRequest;
  loading: boolean;
  error: string;
  detachedParts: RequestPart[];
  onDetach: (part: RequestPart) => void;
  variableNames: string[];
  onChange: (changes: Partial<SavedRequest>) => void;
  onSend: () => void;
  onShowDocs: () => void;
  onPasteCurl: (command: string) => void;
  onCopyCurl: () => void;
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
  variableNames,
  onChange,
  onSend,
  onShowDocs,
  onPasteCurl,
  onCopyCurl,
}: RequestEditorProps) {
  const [selected, setSelected] = useState<SubTab>('params');

  const subTabs = (
    [
      { id: 'params', label: PANEL_TITLES.params, badge: countEnabled(request.params) },
      { id: 'auth', label: PANEL_TITLES.auth },
      { id: 'headers', label: PANEL_TITLES.headers, badge: countEnabled(request.headers) },
      { id: 'body', label: PANEL_TITLES.body },
      { id: 'pre', label: 'Pré-processamento', dot: Boolean(request.preScript.trim()) },
      { id: 'post', label: 'Pós-processamento', dot: Boolean(request.postScript.trim()) },
    ] as Array<{ id: SubTab; label: string; badge?: number; dot?: boolean }>
  ).filter((t) => !(isRequestPart(t.id) && detachedParts.includes(t.id)));

  const tab = subTabs.some((t) => t.id === selected) ? selected : subTabs[0]?.id;

  const renderTab = () => {
    if (!tab) return <EmptyState icon="⇱" title="Todas as partes estão destacadas em painéis" />;
    if (isRequestPart(tab)) {
      const Editor = REQUEST_PART_EDITORS[tab];
      return <Editor request={request} onChange={onChange} variableNames={variableNames} />;
    }
    const field = tab === 'pre' ? 'preScript' : 'postScript';
    return <ScriptEditor phase={tab} value={request[field]} onChange={(value) => onChange({ [field]: value })} />;
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
          onPaste={(event) => {
            const text = event.clipboardData.getData('text');
            if (looksLikeCurl(text)) {
              event.preventDefault();
              onPasteCurl(text);
            }
          }}
        />
        <button
          type="button"
          className="url-action"
          onClick={onCopyCurl}
          title="Copiar como cURL"
          aria-label="Copiar como cURL"
        >
          {'</>'}
        </button>
        <button
          type="button"
          className="url-action"
          onClick={onShowDocs}
          title="Ver na documentação da coleção"
          aria-label="Ver na documentação da coleção"
        >
          ☰
        </button>
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
            {t.dot && (
              <sup className="badge" title="Tem script">
                ●
              </sup>
            )}
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
