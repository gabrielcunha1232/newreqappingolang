import type { Collection } from '../types';

export function collectionNameFromPath(dir: string): string {
  const parts = dir.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || 'Endpoints';
}

export function normalizeBaseUrl(baseUrl: string | undefined | null): string {
  return (baseUrl ?? '').trim().replace(/\/+$/, '');
}

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
