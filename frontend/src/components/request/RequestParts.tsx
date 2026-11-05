import { tryParseJson } from '../../lib/json';
import type { RequestPart, SavedRequest } from '../../types';
import { AuthEditor } from './AuthEditor';
import { KeyValueTable } from './KeyValueTable';

export interface RequestPartProps {
  request: SavedRequest;
  onChange: (changes: Partial<SavedRequest>) => void;
}

export function ParamsPart({ request, onChange }: RequestPartProps) {
  return (
    <KeyValueTable rows={request.params} onChange={(params) => onChange({ params })} addLabel="Adicionar parâmetro" />
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

export function BodyPart({ request, onChange }: RequestPartProps) {
  const formatBody = () => {
    const parsed = tryParseJson(request.body);
    if (parsed.ok) onChange({ body: JSON.stringify(parsed.value, null, 2) });
  };

  return (
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
  );
}

/** Editor de cada parte, usado tanto nas sub-abas quanto nos painéis destacados. */
export const REQUEST_PART_EDITORS: Record<RequestPart, (props: RequestPartProps) => JSX.Element> = {
  params: ParamsPart,
  auth: AuthPart,
  headers: HeadersPart,
  body: BodyPart,
};
