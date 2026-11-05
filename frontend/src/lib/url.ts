import type { Collection, KeyValue } from '../types';

/** "C:\Projetos\GOLANG\teste" → "teste" */
export function collectionNameFromPath(dir: string): string {
  const parts = dir.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || 'Endpoints';
}

/** Guarda a URL base sem barra final ("http://x:8080/" → "http://x:8080"). */
export function normalizeBaseUrl(baseUrl: string | undefined | null): string {
  return (baseUrl ?? '').trim().replace(/\/+$/, '');
}

/** Junta a URL base da coleção com caminhos relativos ("/albums"). */
export function resolveUrl(
  rawUrl: string,
  collection: Collection | undefined
): { url: string; error: string } {
  const url = rawUrl.trim();
  if (!url.startsWith('/')) {
    return { url, error: '' };
  }

  const base = normalizeBaseUrl(collection?.baseUrl);
  if (!base) {
    const alvo = collection ? `da coleção "${collection.name}"` : 'da coleção da requisição';
    return {
      url: '',
      error: `A requisição usa o caminho "${url}", mas não há URL base ${alvo}. Defina-a no menu ⋯ da coleção ou use uma URL completa.`,
    };
  }

  return { url: base + url, error: '' };
}

/** Acrescenta os parâmetros habilitados à query string da URL. */
export function appendQueryParams(url: string, params: KeyValue[]): string {
  const query = params
    .filter((p) => p.enabled && p.key.trim())
    .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
    .join('&');
  if (!query) return url;

  const hashIndex = url.indexOf('#');
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
  const separator = base.includes('?') ? (base.endsWith('?') || base.endsWith('&') ? '' : '&') : '?';
  return base + separator + query + hash;
}
