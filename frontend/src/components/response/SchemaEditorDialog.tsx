import { useMemo, useState } from 'react';
import { schemaFields, setAllRequired, setRequired } from '../../lib/schemaEditor';
import type { JsonSchema } from '../../types';
import { Modal } from '../common/Modal';

interface SchemaEditorDialogProps {
  status: string;
  schema: JsonSchema;
  onSave: (schema: JsonSchema) => void;
  onClose: () => void;
}

function parseSchema(text: string): JsonSchema {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('O schema não é um JSON válido.');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('O schema precisa ser um objeto JSON.');
  return value as JsonSchema;
}

export function SchemaEditorDialog({ status, schema, onSave, onClose }: SchemaEditorDialogProps) {
  const [draft, setDraft] = useState(schema);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fields = useMemo(() => schemaFields(draft), [draft]);

  const current = (): JsonSchema | null => {
    if (text === null) return draft;
    try {
      const parsed = parseSchema(text);
      setError('');
      return parsed;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  const showFields = () => {
    const parsed = current();
    if (!parsed) return;
    setDraft(parsed);
    setText(null);
  };

  const save = () => {
    const parsed = current();
    if (!parsed) return;
    onSave(parsed);
    onClose();
  };

  return (
    <Modal title={`Editar schema do status ${status}`} width={640} onClose={onClose}>
      <div className="modal-form">
        <div className="modal-body">
          <div className="response-toolbar">
            <button type="button" className={text === null ? 'active' : ''} onClick={showFields}>
              Campos
            </button>
            <button type="button" className={text !== null ? 'active' : ''} onClick={() => text === null && setText(JSON.stringify(draft, null, 2))}>
              JSON
            </button>
            <span className="spacer" />
            {text === null && fields.length > 0 && (
              <>
                <button type="button" onClick={() => setDraft(setAllRequired(draft, true))}>
                  Marcar todos
                </button>
                <button type="button" onClick={() => setDraft(setAllRequired(draft, false))}>
                  Desmarcar todos
                </button>
              </>
            )}
          </div>

          {text !== null ? (
            <textarea className="code-input schema-json" aria-label="Schema em JSON" spellCheck={false} value={text} onChange={(event) => setText(event.target.value)} />
          ) : fields.length === 0 ? (
            <p className="hint">Este schema não tem campos de objeto. Use a aba JSON para editá-lo.</p>
          ) : (
            <ul className="schema-fields">
              {fields.map((field) => (
                <li key={field.path} style={{ paddingLeft: 8 + field.depth * 16 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) => setDraft(setRequired(draft, field.parent, field.name, event.target.checked))}
                    />
                    <code title={field.path}>{field.name}</code>
                  </label>
                  <span className="muted">{field.type}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="hint">Campos marcados são obrigatórios: se sumirem da resposta, a validação acusa.</p>
          {error && (
            <div className="inline-error" role="alert">
              ⚠ {error}
            </div>
          )}
        </div>
        <footer className="modal-foot">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary" onClick={save}>
            Salvar
          </button>
        </footer>
      </div>
    </Modal>
  );
}
