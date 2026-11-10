import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { BackupSummary } from '../../hooks/useDataTransfer';
import { Modal } from '../common/Modal';

interface RestoreBackupDialogProps {
  onClose: () => void;
  onInspect: (content: string) => BackupSummary;
  onRestore: (content: string, password?: string) => Promise<void>;
}

export function RestoreBackupDialog({ onClose, onInspect, onRestore }: RestoreBackupDialogProps) {
  const [fileName, setFileName] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!summary || busy) return;
    setBusy(true);
    setError('');
    try {
      await onRestore(content, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
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

          {summary?.encrypted && (
            <label className="field">
              <span>Senha mestra usada neste backup</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
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
          <button type="submit" className="primary" disabled={!summary || busy || (summary.encrypted && !password)}>
            {busy ? 'Restaurando…' : 'Substituir tudo'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
