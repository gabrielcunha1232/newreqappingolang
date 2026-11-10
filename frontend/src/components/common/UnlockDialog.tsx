import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';

interface UnlockDialogProps {
  onUnlock: (password: string) => Promise<void>;
  onDiscard: () => void;
}

export function UnlockDialog({ onUnlock, onDiscard }: UnlockDialogProps) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      await onUnlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Modal title="Desbloquear segredos" onClose={() => {}} closable={false} width={420}>
      {confirmDiscard ? (
        <div className="modal-form">
          <div className="modal-body">
            <p>
              Sem a senha mestra não é possível recuperar tokens, senhas e variáveis secretas. Coleções, requisições, ambientes e
              histórico continuam intactos, mas esses campos ficarão em branco e a senha mestra será desativada.
            </p>
          </div>
          <footer className="modal-foot">
            <button type="button" onClick={() => setConfirmDiscard(false)}>
              Voltar
            </button>
            <button type="button" className="danger" onClick={onDiscard}>
              Apagar segredos e continuar
            </button>
          </footer>
        </div>
      ) : (
        <form className="modal-form" onSubmit={submit}>
          <div className="modal-body">
            <p className="hint">Seus tokens, senhas e variáveis secretas estão criptografados. Digite a senha mestra para abrir.</p>
            <label className="vault-field">
              <span>Senha mestra</span>
              <input
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && (
              <div className="inline-error" role="alert">
                ⚠ {error}
              </div>
            )}
          </div>
          <footer className="modal-foot">
            <button type="button" className="link-button" onClick={() => setConfirmDiscard(true)}>
              Esqueci a senha
            </button>
            <button type="submit" className="primary" disabled={!password || busy}>
              {busy ? 'Desbloqueando…' : 'Desbloquear'}
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
