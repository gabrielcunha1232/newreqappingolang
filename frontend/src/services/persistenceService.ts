import { Load, Save } from '../../bindings/changeme/collectionservice';
import { UNGROUPED_SCOPE } from '../lib/apiDocsScope';
import { defaultAuth, newKeyValue } from '../lib/factories';
import { reconcileParams } from '../lib/query';
import { normalizeBaseUrl } from '../lib/url';
import type {
  Collection,
  Environment,
  HistoryEntry,
  KeyValue,
  PersistedState,
  SavedRequest,
} from '../types';

export interface AppSnapshot {
  collections: Collection[];
  requests: SavedRequest[];
  openRequestIds: string[];
  activeRequestId: string | null;
  openDocIds: string[];
  activeDocId: string | null;
  environments: Environment[];
  activeEnvironmentId: string | null;
  history: HistoryEntry[];
}

/** Arquivos antigos guardavam os cabeçalhos como objeto JSON em string. */
function migrateHeaders(headers: KeyValue[] | string | undefined): KeyValue[] {
  if (Array.isArray(headers)) return headers;
  if (!headers) return [];
  try {
    const parsed = JSON.parse(headers);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([key, value]) =>
        newKeyValue({ key, value: String(value) })
      );
    }
  } catch {
    // Conteúdo inválido: descarta.
  }
  return [];
}

function deserialize(state: Partial<PersistedState>): AppSnapshot {
  // Versões anteriores guardavam os parâmetros só na tabela (fora da URL).
  const requests: SavedRequest[] = (state.requests ?? []).map((request) =>
    reconcileParams({
      id: request.id,
      collectionId: request.collectionId ?? null,
      title: request.title ?? 'Requisição',
      method: request.method ?? 'GET',
      url: request.url ?? '',
      params: request.params ?? [],
      headers: migrateHeaders(request.headers),
      auth: { ...defaultAuth(), ...request.auth },
      bodyType: request.bodyType ?? 'json',
      body: request.body ?? '',
      preScript: request.preScript ?? '',
      postScript: request.postScript ?? '',
      source: request.source,
      doc: request.doc,
    })
  );

  const ids = new Set(requests.map((r) => r.id));
  // Arquivos antigos não têm abas abertas: abre a primeira requisição.
  const openRequestIds = state.openRequestIds
    ? state.openRequestIds.filter((id) => ids.has(id))
    : requests.slice(0, 1).map((r) => r.id);
  const activeRequestId =
    state.activeRequestId && openRequestIds.includes(state.activeRequestId)
      ? state.activeRequestId
      : openRequestIds[0] ?? null;

  const collections = (state.collections ?? []).map((collection) => ({
    ...collection,
    baseUrl: normalizeBaseUrl(collection.baseUrl),
  }));

  // Abas de documentação de coleções que não existem mais são descartadas.
  const docScopes = new Set([...collections.map((c) => c.id), UNGROUPED_SCOPE]);
  const openDocIds = (state.openDocIds ?? []).filter((id) => docScopes.has(id));
  const activeDocId = state.activeDocId && openDocIds.includes(state.activeDocId) ? state.activeDocId : null;

  return {
    collections,
    requests,
    openRequestIds,
    activeRequestId,
    openDocIds,
    activeDocId,
    environments: state.environments ?? [],
    activeEnvironmentId: state.activeEnvironmentId ?? null,
    history: state.history ?? [],
  };
}

/** Retorna null quando não há estado salvo (ou o bridge do Wails não existe). */
export async function loadState(): Promise<AppSnapshot | null> {
  const raw = await Load();
  if (!raw) return null;
  return deserialize(JSON.parse(raw) as Partial<PersistedState>);
}

export async function saveState(snapshot: AppSnapshot): Promise<void> {
  const state: PersistedState = { ...snapshot };
  await Save(JSON.stringify(state));
}
