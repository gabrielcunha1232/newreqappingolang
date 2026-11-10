import { useState, type FormEvent } from 'react';
import { Modal } from '../common/Modal';

type Source = 'file' | 'url' | 'paste';

const SOURCES: Array<{ id: Source; label: string }> = [
  { id: 'file', label: 'Arquivo' },
  { id: 'url', label: 'URL' },
  { id: 'paste', label: 'Colar' },
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface ImportOpenApiDialogProps {
  onClose: () => void;
  onImportText: (text: string, origin: string) => void;
  onImportUrl: (url: string) => Promise<void>;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function ImportOpenApiDialog({ onClose, onImportText, onImportUrl }: ImportOpenApiDialogProps) {
  const [source, setSource] = useState<Source>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = source === 'file' ? Boolean(file) : source === 'url' ? Boolean(url.trim()) : Boolean(text.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setError('');
    setBusy(true);
    try {
      if (source === 'url') {
        await onImportUrl(url);
      } else if (source === 'file' && file) {
        if (file.size > MAX_FILE_BYTES) throw new Error('Arquivo maior que 10 MB.');
        onImportText(await file.text(), file.name);
      } else {
        onImportText(text, 'texto colado');
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal title="Importar OpenAPI / Swagger" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="modal-body">
          <p className="hint">
            OpenAPI 3.x ou Swagger 2.0, em JSON ou YAML. Cada operação vira uma requisição numa nova coleção, e a
            documentação é aberta em seguida.
          </p>

          <div className="segmented" role="tablist" aria-label="Origem da especificação">
            {SOURCES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={source === item.id}
                className={source === item.id ? 'active' : ''}
                onClick={() => {
                  setSource(item.id);
                  setError('');
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {source === 'file' && (
            <label className="import-file">
              <input
                type="file"
                accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <span className="muted">{file ? file.name : 'Nenhum arquivo escolhido (.json, .yaml, .yml)'}</span>
            </label>
          )}

          {source === 'url' && (
            <input
              type="url"
              aria-label="URL da especificação"
              placeholder="https://api.exemplo.com/openapi.json"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          )}

          {source === 'paste' && (
            <textarea
              className="code-input import-paste"
              aria-label="Conteúdo da especificação"
              placeholder={'openapi: 3.0.3\ninfo:\n  title: Minha API\n...'}
              spellCheck={false}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          )}

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
          <button type="submit" className="primary" disabled={!ready || busy}>
            {busy ? 'Importando…' : 'Importar'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
