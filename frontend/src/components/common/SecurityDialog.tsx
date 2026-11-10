import { useState, type FormEvent } from 'react';
import { MIN_PASSWORD_LENGTH, type Vault } from '../../hooks/useVault';
import { Modal } from './Modal';

interface SecurityDialogProps {
  vault: Vault;
  notify: (message: string) => void;
}

type Mode = 'enable' | 'change' | 'disable';

export function SecurityDialog({ vault, notify }: SecurityDialogProps) {
  const { enabled, settings, actions } = vault;
  const [mode, setMode] = useState<Mode>(enabled ? 'change' : 'enable');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = (nextMode: Mode) => {
    setMode(nextMode);
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  };

  const needsNew = mode !== 'disable';
  const mismatch = needsNew && confirm !== '' && next !== confirm;
  const ready =
    (mode === 'enable' || current !== '') && (!needsNew || (next.length >= MIN_PASSWORD_LENGTH && next === confirm));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'enable') {
        await actions.enable(next);
        notify('Senha mestra ativada. Os segredos agora são salvos criptografados.');
        reset('change');
      } else if (mode === 'change') {
        await actions.changePassword(current, next);
        notify('Senha mestra alterada.');
        reset('change');
      } else {
        await actions.disable(current);
        notify('Senha mestra desativada. Os segredos voltam a ser salvos em texto puro.');
        reset('enable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const submitLabel = mode === 'enable' ? 'Ativar senha mestra' : mode === 'change' ? 'Alterar senha' : 'Desativar senha mestra';

  return (
    <Modal title="Segurança" onClose={actions.closeDialog} width={500}>
      <div className="modal-form">
        <div className="modal-body">
          <section className="vault-section">
            <header className="vault-head">
              <h3>Senha mestra</h3>
              <span className={'vault-status' + (enabled ? ' on' : '')}>{enabled ? 'Ativa' : 'Desativada'}</span>
            </header>
            <p className="hint">
              Criptografa no disco os tokens, senhas, client secrets, cabeçalhos sensíveis e variáveis secretas (AES-256-GCM, chave
              derivada da senha). A senha é pedida ao abrir o app. Se ela for esquecida, os segredos não podem ser recuperados.
            </p>

            {enabled && (
              <div className="vault-modes" role="group" aria-label="Ação">
                <button type="button" className={mode === 'change' ? 'active' : ''} onClick={() => reset('change')}>
                  Alterar senha
                </button>
                <button type="button" className={mode === 'disable' ? 'active' : ''} onClick={() => reset('disable')}>
                  Desativar
                </button>
              </div>
            )}

            <form className="vault-form" onSubmit={submit}>
              {mode !== 'enable' && (
                <label className="vault-field">
                  <span>Senha atual</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={current}
                    onChange={(event) => setCurrent(event.target.value)}
                  />
                </label>
              )}
              {needsNew && (
                <>
                  <label className="vault-field">
                    <span>{mode === 'enable' ? 'Nova senha mestra' : 'Nova senha'}</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={next}
                      onChange={(event) => setNext(event.target.value)}
                    />
                    <small className="hint">Pelo menos {MIN_PASSWORD_LENGTH} caracteres.</small>
                  </label>
                  <label className="vault-field">
                    <span>Confirmar senha</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                    />
                    {mismatch && <small className="vault-warn">As senhas não conferem.</small>}
                  </label>
                </>
              )}
              {error && (
                <div className="inline-error" role="alert">
                  ⚠ {error}
                </div>
              )}
              <div className="vault-actions">
                <button type="submit" className={mode === 'disable' ? 'danger' : 'primary'} disabled={!ready || busy}>
                  {busy ? 'Aguarde…' : submitLabel}
                </button>
              </div>
            </form>
          </section>

          <section className="vault-section">
            <header className="vault-head">
              <h3>Armazenamento</h3>
            </header>
            <label className="toggle">
              <input
                type="checkbox"
                checked={!settings.persistAccessTokens}
                onChange={(event) => actions.setSettings({ persistAccessTokens: !event.target.checked })}
              />
              <span>Não salvar tokens de acesso OAuth 2.0 no disco (são obtidos de novo quando necessário)</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.maskStoredResponses}
                onChange={(event) => actions.setSettings({ maskStoredResponses: event.target.checked })}
              />
              <span>Mascarar segredos conhecidos nas respostas e no histórico salvos</span>
            </label>
          </section>
        </div>
        <footer className="modal-foot">
          <button type="button" className="primary" onClick={actions.closeDialog}>
            Concluir
          </button>
        </footer>
      </div>
    </Modal>
  );
}
