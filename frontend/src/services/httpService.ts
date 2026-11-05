import { DoRequest } from '../../bindings/changeme/httpclientservice';
import { Request, type Response } from '../../bindings/changeme/internal/models/models';
import { appendQueryParams, resolveUrl } from '../lib/url';
import { findUnresolved, interpolate } from '../lib/variables';
import type { Collection, RequestAuth, SavedRequest } from '../types';

export type BuildResult =
  | { ok: true; request: Request; warnings: string[] }
  | { ok: false; error: string };

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function authHeaders(auth: RequestAuth, sub: (text: string) => string): Record<string, string> {
  switch (auth.type) {
    case 'bearer':
      return auth.token.trim() ? { Authorization: `Bearer ${sub(auth.token.trim())}` } : {};
    case 'basic':
      return { Authorization: `Basic ${encodeBase64(`${sub(auth.username)}:${sub(auth.password)}`)}` };
    case 'apikey':
      return auth.apiKeyName.trim() ? { [sub(auth.apiKeyName.trim())]: sub(auth.apiKeyValue) } : {};
    default:
      return {};
  }
}

/**
 * Monta a requisição enviada ao Go: aplica variáveis do ambiente, URL base da
 * coleção, parâmetros de query, cabeçalhos habilitados e autenticação.
 */
export function buildHttpRequest(
  saved: SavedRequest,
  collection: Collection | undefined,
  vars: Record<string, string>
): BuildResult {
  const sub = (text: string) => interpolate(text, vars);

  const { url: resolved, error } = resolveUrl(sub(saved.url), collection);
  if (error) return { ok: false, error };
  if (!resolved) return { ok: false, error: 'Informe a URL da requisição.' };

  const params = saved.params.map((p) => ({ ...p, key: sub(p.key), value: sub(p.value) }));
  const url = appendQueryParams(resolved, params);

  const headers: Record<string, string> = {};
  for (const header of saved.headers) {
    if (header.enabled && header.key.trim()) {
      headers[sub(header.key.trim())] = sub(header.value);
    }
  }
  Object.assign(headers, authHeaders(saved.auth, sub));

  const body = sub(saved.body);
  const warnings = findUnresolved(
    [url, body, ...Object.keys(headers), ...Object.values(headers)].join('\n'),
    vars
  ).map((name) => `Variável {{${name}}} não definida no ambiente ativo.`);

  return {
    ok: true,
    request: new Request({ method: saved.method, url, headers, body }),
    warnings,
  };
}

export async function sendHttpRequest(request: Request): Promise<Response> {
  const response = await DoRequest(request);
  if (!response) throw new Error('O serviço HTTP não retornou resposta.');
  return response;
}
