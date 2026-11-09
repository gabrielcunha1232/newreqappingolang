import { Browser } from '@wailsio/runtime';
import { useRef, useState } from 'react';
import { authorizationUrl, isTokenExpired, parseAuthorizationInput, pkceChallenge, randomToken } from '../../lib/oauth2';
import { exchangeAuthorizationCode, fetchClientCredentialsToken } from '../../services/oauthService';
import type { OAuth2Grant, OAuth2Settings } from '../../types';

interface OAuth2EditorProps {
  settings: OAuth2Settings;
  variables: Record<string, string>;
  onChange: (settings: OAuth2Settings) => void;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function tokenStatus(settings: OAuth2Settings): string {
  if (!settings.accessToken) return 'Sem token.';
  if (settings.expiresAt === null) return 'Token obtido (o servidor não informou a validade).';
  const time = new Date(settings.expiresAt).toLocaleString();
  return isTokenExpired(settings) ? `Token expirado em ${time}.` : `Token válido até ${time}.`;
}

export function OAuth2Editor({ settings, variables, onChange }: OAuth2EditorProps) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [redirectInput, setRedirectInput] = useState('');
  const [awaitingCode, setAwaitingCode] = useState(false);
  const pkce = useRef({ verifier: '', state: '' });

  const set = (changes: Partial<OAuth2Settings>) => onChange({ ...settings, ...changes });
  const isCodeFlow = settings.grant === 'authorization_code';

  const run = async (task: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await task();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const getClientToken = () =>
    run(async () => {
      set(await fetchClientCredentialsToken(settings, variables));
    });

  const startAuthorization = () =>
    run(async () => {
      const sub = (text: string) => text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, name: string) => variables[name] ?? match);
      const verifier = randomToken();
      const state = randomToken();
      const url = authorizationUrl(settings, sub, state, await pkceChallenge(verifier));
      pkce.current = { verifier, state };
      await Browser.OpenURL(url);
      setAwaitingCode(true);
    });

  const finishAuthorization = () =>
    run(async () => {
      const code = parseAuthorizationInput(redirectInput, pkce.current.state);
      set(await exchangeAuthorizationCode(settings, variables, code, pkce.current.verifier));
      setAwaitingCode(false);
      setRedirectInput('');
    });

  const field = (key: 'tokenUrl' | 'authUrl' | 'redirectUri' | 'clientId' | 'clientSecret' | 'scope', placeholder: string, secret = false) => (
    <input
      className="full"
      type={secret ? 'password' : 'text'}
      aria-label={placeholder}
      placeholder={placeholder}
      value={settings[key]}
      onChange={(event) => set({ [key]: event.target.value })}
    />
  );

  return (
    <>
      <label className="form-row">
        <span>Fluxo</span>
        <select value={settings.grant} onChange={(event) => set({ grant: event.target.value as OAuth2Grant })}>
          <option value="client_credentials">Client Credentials</option>
          <option value="authorization_code">Authorization Code (PKCE)</option>
        </select>
      </label>

      {isCodeFlow && field('authUrl', 'URL de autorização')}
      {field('tokenUrl', 'URL de token')}
      {field('clientId', 'Client ID')}
      {field('clientSecret', 'Client Secret', true)}
      {field('scope', 'Escopos (separados por espaço)')}
      {isCodeFlow && field('redirectUri', 'URL de retorno cadastrada no provedor')}

      <div className="oauth-status">
        {isCodeFlow ? (
          <button type="button" disabled={busy || !settings.authUrl.trim() || !settings.clientId.trim()} onClick={startAuthorization}>
            Autorizar no navegador
          </button>
        ) : (
          <button type="button" disabled={busy || !settings.tokenUrl.trim() || !settings.clientId.trim()} onClick={getClientToken}>
            {busy ? 'Obtendo…' : 'Obter token'}
          </button>
        )}
        {settings.accessToken && (
          <button type="button" onClick={() => set({ accessToken: '', refreshToken: '', expiresAt: null })}>
            Limpar token
          </button>
        )}
        <span className="hint" role="status">
          {tokenStatus(settings)}
        </span>
      </div>

      {awaitingCode && (
        <>
          <p className="hint">
            Depois de autorizar, o navegador vai para a URL de retorno. Cole aqui o endereço completo daquela página, mesmo
            que ela mostre erro.
          </p>
          <input
            className="full"
            aria-label="URL de retorno ou código"
            placeholder="URL de retorno ou código"
            value={redirectInput}
            onChange={(event) => setRedirectInput(event.target.value)}
          />
          <div className="oauth-status">
            <button type="button" className="primary" disabled={busy || !redirectInput.trim()} onClick={finishAuthorization}>
              Trocar pelo token
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="inline-error" role="alert">
          ⚠ {error}
        </div>
      )}
    </>
  );
}
