import type { AuthType, RequestAuth } from '../../types';

const AUTH_TYPES: Array<{ value: AuthType; label: string }> = [
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'apikey', label: 'API Key' },
  { value: 'none', label: 'Sem autenticação' },
];

interface AuthEditorProps {
  auth: RequestAuth;
  onChange: (auth: RequestAuth) => void;
}

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const set = (changes: Partial<RequestAuth>) => onChange({ ...auth, ...changes });

  return (
    <div className="form-stack">
      <label className="form-row">
        <span>Tipo de autenticação</span>
        <select value={auth.type} onChange={(event) => set({ type: event.target.value as AuthType })}>
          {AUTH_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {auth.type === 'bearer' && (
        <input
          className="full"
          placeholder="Token de acesso (aceita {{variavel}})"
          value={auth.token}
          onChange={(event) => set({ token: event.target.value })}
        />
      )}

      {auth.type === 'basic' && (
        <>
          <input
            className="full"
            placeholder="Usuário"
            value={auth.username}
            onChange={(event) => set({ username: event.target.value })}
          />
          <input
            className="full"
            type="password"
            placeholder="Senha"
            value={auth.password}
            onChange={(event) => set({ password: event.target.value })}
          />
        </>
      )}

      {auth.type === 'apikey' && (
        <>
          <input
            className="full"
            placeholder="Nome do cabeçalho (ex.: X-API-Key)"
            value={auth.apiKeyName}
            onChange={(event) => set({ apiKeyName: event.target.value })}
          />
          <input
            className="full"
            placeholder="Valor da chave"
            value={auth.apiKeyValue}
            onChange={(event) => set({ apiKeyValue: event.target.value })}
          />
        </>
      )}

      {auth.type === 'none' && <p className="hint">Esta requisição não envia credenciais.</p>}
    </div>
  );
}
