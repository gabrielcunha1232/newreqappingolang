import type { KeyValue, SavedRequest } from '../types';
import { newKeyValue } from './factories';

/*
 * A query string da URL e a tabela de parâmetros mostram a mesma coisa:
 * as linhas habilitadas e com nome estão na URL; linhas desabilitadas ou
 * sem nome existem só na tabela. Os valores ficam crus (sem codificação),
 * para que {{variáveis}} continuem legíveis; a codificação acontece no envio.
 */

interface UrlParts {
  base: string;
  query: string;
  hash: string;
}

export function splitUrl(url: string): UrlParts {
  const hashIndex = url.indexOf('#');
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
  const withoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  return queryIndex === -1
    ? { base: withoutHash, query: '', hash }
    : { base: withoutHash.slice(0, queryIndex), query: withoutHash.slice(queryIndex + 1), hash };
}

export function parseQuery(query: string): Array<{ key: string; value: string }> {
  return query
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf('=');
      return eq === -1 ? { key: pair, value: '' } : { key: pair.slice(0, eq), value: pair.slice(eq + 1) };
    });
}

/** Linha que aparece na URL. */
function inUrl(param: KeyValue) {
  return param.enabled && param.key.trim() !== '';
}

/** Reescreve a query string da URL a partir da tabela de parâmetros. */
export function urlWithParams(url: string, params: KeyValue[]): string {
  const { base, hash } = splitUrl(url);
  const query = params
    .filter(inUrl)
    .map((p) => `${p.key}=${p.value}`)
    .join('&');
  return base + (query ? `?${query}` : '') + hash;
}

/**
 * Atualiza a tabela a partir da query string digitada na URL, preservando
 * ids e descrições das linhas existentes e as linhas que não estão na URL.
 */
export function paramsFromUrl(url: string, params: KeyValue[]): KeyValue[] {
  const pairs = parseQuery(splitUrl(url).query);
  const result: KeyValue[] = [];

  for (const param of params) {
    if (!inUrl(param)) {
      result.push(param);
      continue;
    }
    const pair = pairs.shift();
    if (pair) result.push({ ...param, key: pair.key, value: pair.value });
  }
  for (const pair of pairs) {
    result.push(newKeyValue({ key: pair.key, value: pair.value }));
  }
  return result;
}

/** Aplica uma alteração mantendo URL e parâmetros em sincronia. */
export function applyRequestChanges(request: SavedRequest, changes: Partial<SavedRequest>): SavedRequest {
  const next = { ...request, ...changes };
  if (changes.url !== undefined && changes.params === undefined) {
    next.params = paramsFromUrl(next.url, request.params);
  } else if (changes.params !== undefined && changes.url === undefined) {
    next.url = urlWithParams(request.url, next.params);
  }
  return next;
}

/**
 * Deixa URL e tabela consistentes quando vieram de fontes diferentes:
 * requisições salvas antes da sincronização (parâmetros só na tabela) ou
 * criadas a partir de uma URL com query (histórico).
 */
export function reconcileParams(request: SavedRequest): SavedRequest {
  const pairs = parseQuery(splitUrl(request.url).query);
  const missing = pairs.filter(
    (pair) => !request.params.some((p) => inUrl(p) && p.key === pair.key && p.value === pair.value)
  );
  const params = [...missing.map((pair) => newKeyValue({ key: pair.key, value: pair.value })), ...request.params];
  return { ...request, params, url: urlWithParams(request.url, params) };
}

function encodePart(text: string): string {
  // Aceita tanto valores crus ("a b") quanto já codificados ("a%20b").
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    // "%" solto: codifica o texto como está.
  }
  return encodeURIComponent(decoded);
}

/** Codifica chaves e valores da query string para o envio. */
export function encodeQuery(url: string): string {
  const { base, query, hash } = splitUrl(url);
  if (!query) return url;
  const encoded = parseQuery(query)
    .map(({ key, value }) => `${encodePart(key)}=${encodePart(value)}`)
    .join('&');
  return `${base}?${encoded}${hash}`;
}
