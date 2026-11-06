import { DoRequest } from '../../bindings/changeme/httpclientservice';
import { Request, type Response } from '../../bindings/changeme/internal/models/models';
import { findJsonError } from '../lib/jsonBody';
import { fillPathParams } from '../lib/pathTemplate';
import { encodeQuery } from '../lib/query';
import { resolveUrl } from '../lib/url';
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
 * coleção, codifica a query string e junta cabeçalhos habilitados e autenticação.
 */
export function buildHttpRequest(
  saved: SavedRequest,
  collection: Collection | undefined,
  vars: Record<string, string>
): BuildResult {
  const sub = (text: string) => interpolate(text, vars);

  const { url: base, error } = resolveUrl(sub(saved.url), collection);
  if (error) return { ok: false, error };
  if (!base) return { ok: false, error: 'Informe a URL da requisição.' };

  // ":id" / "{id}" recebem os valores da tabela de variáveis de caminho.
  const pathValues = Object.fromEntries(Object.entries(saved.pathValues).map(([name, value]) => [name, sub(value)]));
  const { url: resolved, missing } = fillPathParams(base, pathValues);

  // Os parâmetros já estão na URL (sincronizados com a tabela); só codifica.
  const url = encodeQuery(resolved);

  const headers: Record<string, string> = {};
  for (const header of saved.headers) {
    if (header.enabled && header.key.trim()) {
      headers[sub(header.key.trim())] = sub(header.value);
    }
  }
  Object.assign(headers, authHeaders(saved.auth, sub));

  const body = sub(saved.body);
  const bodyWarnings: string[] = [];
  if (saved.bodyType === 'json' && body.trim()) {
    // Como no Postman: corpo JSON leva o Content-Type, a menos que o usuário defina outro.
    if (!Object.keys(headers).some((name) => name.toLowerCase() === 'content-type')) {
      headers['Content-Type'] = 'application/json';
    }
    const jsonError = findJsonError(saved.body);
    if (jsonError) {
      bodyWarnings.push(
        `Corpo JSON inválido (linha ${jsonError.line}, coluna ${jsonError.column}): ${jsonError.message}. Enviando assim mesmo.`
      );
    }
  }
  // Checa a URL antes da codificação ("{{" vira "%7B%7B" depois dela).
  const warnings = findUnresolved(
    [resolved, body, ...Object.keys(headers), ...Object.values(headers)].join('\n'),
    vars
  )
    .map((name) => `Variável {{${name}}} não definida no ambiente ativo.`)
    .concat(missing.map((name) => `Variável de caminho "${name}" sem valor: preencha na aba Parâmetros.`))
    .concat(bodyWarnings);

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
