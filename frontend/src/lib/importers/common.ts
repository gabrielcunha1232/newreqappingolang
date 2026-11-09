import type { Collection, KeyValue, SavedRequest } from '../../types';

/** Coleção pronta para entrar no workspace, com o ambiente que veio junto. */
export interface CollectionImport {
  collection: Collection;
  requests: SavedRequest[];
  environment?: { name: string; variables: KeyValue[] };
  warnings: string[];
}

export type Json = Record<string, unknown>;

export function isJson(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asJson(value: unknown): Json {
  return isJson(value) ? value : {};
}

export function asList(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter(isJson) : [];
}

export function text(value: unknown): string {
  if (value === undefined || value === null) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
