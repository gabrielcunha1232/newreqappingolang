import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { BackupSummary } from '../../hooks/useDataTransfer';
import { Modal } from '../common/Modal';

interface RestoreBackupDialogProps {
  onClose: () => void;
  onInspect: (content: string) => BackupSummary;
  onRestore: (content: string) => void;
}

export function RestoreBackupDialog({ onClose, onInspect, onRestore }: RestoreBackupDialogProps) {
  const [fileName, setFileName] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [error, setError] = useState('');

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSummary(null);
    setError('');
    setFileName(file?.name ?? '');
    if (!file) return;
    try {
      const text = await file.text();
      setSummary(onInspect(text));
      setContent(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!summary) return;
    try {
      onRestore(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal title="Restaurar backup" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="modal-body">
          <p className="hint">
            A restauração substitui todas as coleções, ambientes e o histórico atuais. Antes disso, o app baixa uma cópia dos dados
            de agora.
          </p>

          <label className="import-file">
            <input type="file" accept=".json,application/json" onChange={choose} />
            <span className="muted">{fileName || 'Nenhum arquivo escolhido (.json)'}</span>
          </label>

          {summary && (
            <p>
              Backup de {summary.exportedAt ? new Date(summary.exportedAt).toLocaleString('pt-BR') : 'data desconhecida'}:{' '}
              {summary.collections} coleção(ões), {summary.requests} requisição(ões) e {summary.environments} ambiente(s).
            </p>
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
          <button type="submit" className="primary" disabled={!summary}>
            Substituir tudo
          </button>
        </footer>
      </form>
    </Modal>
  );
}
