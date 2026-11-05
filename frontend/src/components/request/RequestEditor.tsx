import { useState } from 'react';
import { HTTP_METHODS } from '../../lib/factories';
import { tryParseJson } from '../../lib/json';
import type { SavedRequest } from '../../types';
import { AuthEditor } from './AuthEditor';
import { KeyValueTable } from './KeyValueTable';

type SubTab = 'params' | 'auth' | 'headers' | 'body' | 'pre' | 'post';

interface RequestEditorProps {
  request: SavedRequest;
  loading: boolean;
  error: string;
  onChange: (changes: Partial<SavedRequest>) => void;
  onSend: () => void;
}

function countEnabled(rows: SavedRequest['params']) {
  return rows.filter((r) => r.enabled && r.key.trim()).length;
}

export function RequestEditor({ request, loading, error, onChange, onSend }: RequestEditorProps) {
  const [tab, setTab] = useState<SubTab>('params');

  const subTabs: Array<{ id: SubTab; label: string; badge?: number }> = [
    { id: 'params', label: 'Parâmetros', badge: countEnabled(request.params) },
    { id: 'auth', label: 'Autorização' },
    { id: 'headers', label: 'Cabeçalhos', badge: countEnabled(request.headers) },
    { id: 'body', label: 'Corpo' },
    { id: 'pre', label: 'Pré-processamento' },
    { id: 'post', label: 'Pós-processamento' },
  ];

  const formatBody = () => {
    const parsed = tryParseJson(request.body);
    if (parsed.ok) onChange({ body: JSON.stringify(parsed.value, null, 2) });
  };

  return (
    <form
      className="request-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (!loading) onSend();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (!loading) onSend();
        }
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
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {Boolean(t.badge) && <sup className="badge">{t.badge}</sup>}
          </button>
        ))}
      </div>

      <div className="tabcontent">
        {tab === 'params' && (
          <KeyValueTable
            rows={request.params}
            onChange={(params) => onChange({ params })}
            addLabel="Adicionar parâmetro"
          />
        )}

        {tab === 'auth' && <AuthEditor auth={request.auth} onChange={(auth) => onChange({ auth })} />}

        {tab === 'headers' && (
          <KeyValueTable
            rows={request.headers}
            onChange={(headers) => onChange({ headers })}
            addLabel="Adicionar cabeçalho"
            keyPlaceholder="Content-Type"
            valuePlaceholder="application/json"
          />
        )}

        {tab === 'body' && (
          <>
            <textarea
              className="code-input"
              value={request.body}
              spellCheck={false}
              placeholder={'{\n  "name": "Novo usuário"\n}'}
              onChange={(event) => onChange({ body: event.target.value })}
            />
            <div className="editor-actions">
              <button type="button" className="addrow" onClick={formatBody}>
                ⇲ Formatar JSON
              </button>
            </div>
          </>
        )}

        {tab === 'pre' && (
          <textarea
            className="code-input"
            value={request.preScript}
            spellCheck={false}
            placeholder="// JavaScript executado antes da requisição (salvo com a requisição; execução ainda não suportada)"
            onChange={(event) => onChange({ preScript: event.target.value })}
          />
        )}

        {tab === 'post' && (
          <textarea
            className="code-input"
            value={request.postScript}
            spellCheck={false}
            placeholder="// Testes executados após a resposta (salvo com a requisição; execução ainda não suportada)"
            onChange={(event) => onChange({ postScript: event.target.value })}
          />
        )}
      </div>
    </form>
  );
}
