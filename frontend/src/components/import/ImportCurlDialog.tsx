import { useState, type FormEvent } from 'react';
import { Modal } from '../common/Modal';

interface ImportCurlDialogProps {
  onClose: () => void;
  onImport: (command: string) => void;
}

const PLACEHOLDER = `curl -X POST 'https://api.exemplo.com/users' \\
  -H 'Content-Type: application/json' \\
  -d '{"nome": "Ana"}'`;

export function ImportCurlDialog({ onClose, onImport }: ImportCurlDialogProps) {
  const [command, setCommand] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      onImport(command);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal title="Importar cURL" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="modal-body">
          <p className="hint">
            Aceita o formato bash e o cmd do Windows (como o "Copy as cURL" do navegador). Dica: colar um cURL direto no
            campo de URL substitui a requisição aberta.
          </p>
          <textarea
            className="code-input import-paste"
            aria-label="Comando curl"
            placeholder={PLACEHOLDER}
            spellCheck={false}
            value={command}
            onChange={(event) => {
              setCommand(event.target.value);
              setError('');
            }}
          />
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
          <button type="submit" className="primary" disabled={!command.trim()}>
            Criar requisição
          </button>
        </footer>
      </form>
    </Modal>
  );
}
