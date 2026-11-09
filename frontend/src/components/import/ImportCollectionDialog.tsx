import { useState, type FormEvent } from 'react';
import { Modal } from '../common/Modal';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

interface ImportCollectionDialogProps {
  onClose: () => void;
  /** Lança Error com mensagem para o usuário se o conteúdo for inválido. */
  onImport: (content: string, origin: string) => void;
}

/** Importação de coleções do Postman e do Insomnia, por arquivo ou texto colado. */
export function ImportCollectionDialog({ onClose, onImport }: ImportCollectionDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = Boolean(file) || Boolean(content.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setError('');
    setBusy(true);
    try {
      if (file) {
        if (file.size > MAX_FILE_BYTES) throw new Error('Arquivo maior que 20 MB.');
        onImport(await file.text(), file.name);
      } else {
        onImport(content, 'texto colado');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Modal title="Importar Postman / Insomnia" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="modal-body">
          <p className="hint">
            Coleção Postman v2.0 ou v2.1, ou export do Insomnia no formato 4 (JSON). As pastas são mantidas, e as variáveis
            criam um novo ambiente.
          </p>

          <label className="import-file">
            <input type="file" accept=".json,application/json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <span className="muted">{file ? file.name : 'Nenhum arquivo escolhido (.json)'}</span>
          </label>

          {!file && (
            <textarea
              className="code-input import-paste"
              aria-label="Conteúdo da coleção"
              placeholder="Ou cole o JSON aqui"
              spellCheck={false}
              value={content}
              onChange={(event) => setContent(event.target.value)}
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
