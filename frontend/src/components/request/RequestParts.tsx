import { useMemo } from 'react';
import { findJsonError, formatJsonBody } from '../../lib/jsonBody';
import { extractPathParams, splitBaseAndPath } from '../../lib/pathTemplate';
import type { BodyType, RequestPart, SavedRequest } from '../../types';
import { CodeEditor } from '../editor/CodeEditor';
import { AuthEditor } from './AuthEditor';
import { KeyValueTable } from './KeyValueTable';
import { PathVariablesTable } from './PathVariablesTable';

export interface RequestPartProps {
  request: SavedRequest;
  onChange: (changes: Partial<SavedRequest>) => void;
  /** Variáveis do ambiente ativo (usadas no editor do corpo). */
  variableNames: string[];
}

export function ParamsPart({ request, onChange }: RequestPartProps) {
  const pathParams = useMemo(() => extractPathParams(splitBaseAndPath(request.url).path), [request.url]);
  const descriptions = useMemo(
    () =>
      Object.fromEntries(
        (request.doc?.params ?? []).filter((p) => p.in === 'path').map((p) => [p.name, p.description])
      ),
    [request.doc]
  );

  const queryTable = (
    <KeyValueTable rows={request.params} onChange={(params) => onChange({ params })} addLabel="Adicionar parâmetro" />
  );
  if (pathParams.length === 0) return queryTable;

  return (
    <div className="params-sections">
      <section>
        <h4 className="part-heading">Variáveis de caminho</h4>
        <PathVariablesTable
          params={pathParams}
          values={request.pathValues}
          descriptions={descriptions}
          onChange={(pathValues) => onChange({ pathValues })}
        />
      </section>
      <section>
        <h4 className="part-heading">Parâmetros de query</h4>
        {queryTable}
      </section>
    </div>
  );
}

export function AuthPart({ request, onChange }: RequestPartProps) {
  return <AuthEditor auth={request.auth} onChange={(auth) => onChange({ auth })} />;
}

export function HeadersPart({ request, onChange }: RequestPartProps) {
  return (
    <KeyValueTable
      rows={request.headers}
      onChange={(headers) => onChange({ headers })}
      addLabel="Adicionar cabeçalho"
      keyPlaceholder="Content-Type"
      valuePlaceholder="application/json"
    />
  );
}

const BODY_PLACEHOLDER = `{
  "nome": "Novo usuário",
  "token": "{{token}}"
}`;

export function BodyPart({ request, onChange, variableNames }: RequestPartProps) {
  const isJson = request.bodyType === 'json';
  const error = isJson ? findJsonError(request.body) : null;
  const isEmpty = !request.body.trim();

  const reformat = (indent: number) => {
    const formatted = formatJsonBody(request.body, indent);
    if (formatted !== null) onChange({ body: formatted });
  };

  return (
    <div className="body-editor">
      <div className="body-toolbar">
        <div className="segmented" role="radiogroup" aria-label="Tipo do corpo">
          {(['json', 'text'] as BodyType[]).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={request.bodyType === type}
              className={request.bodyType === type ? 'active' : ''}
              onClick={() => onChange({ bodyType: type })}
            >
              {type === 'json' ? 'JSON' : 'Texto'}
            </button>
          ))}
        </div>

        {isJson && !isEmpty && (
          <span className={'body-status ' + (error ? 'invalid' : 'valid')} role="status">
            {error ? `✕ Linha ${error.line}, coluna ${error.column}: ${error.message}` : '✓ JSON válido'}
          </span>
        )}

        {isJson && (
          <span className="body-actions">
            <button type="button" onClick={() => reformat(2)} disabled={isEmpty || !!error} title="Formatar (Shift+Alt+F)">
              {'{ }'} Formatar
            </button>
            <button type="button" onClick={() => reformat(0)} disabled={isEmpty || !!error} title="Remover espaços e quebras de linha">
              Minificar
            </button>
          </span>
        )}
      </div>

      <CodeEditor
        value={request.body}
        onChange={(body) => onChange({ body })}
        language={isJson ? 'json' : 'text'}
        variableNames={variableNames}
        placeholder={isJson ? BODY_PLACEHOLDER : 'Corpo da requisição'}
        ariaLabel="Corpo da requisição"
        onFormat={() => reformat(2)}
      />

      {isJson && (
        <p className="hint body-hint">
          Digite {'{{'} para inserir uma variável do ambiente. Variáveis podem ficar sem aspas, ex.: {'"id": {{user_id}}'}.
          O cabeçalho Content-Type: application/json é enviado automaticamente.
        </p>
      )}
    </div>
  );
}

/** Editor de cada parte, usado tanto nas sub-abas quanto nos painéis destacados. */
export const REQUEST_PART_EDITORS: Record<RequestPart, (props: RequestPartProps) => JSX.Element> = {
  params: ParamsPart,
  auth: AuthPart,
  headers: HeadersPart,
  body: BodyPart,
};
