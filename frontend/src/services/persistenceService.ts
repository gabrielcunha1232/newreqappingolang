import { Load, Save } from '../../bindings/changeme/collectionservice';
import { defaultAuth, newKeyValue } from '../lib/factories';
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
  const requests: SavedRequest[] = (state.requests ?? []).map((request) => ({
    id: request.id,
    collectionId: request.collectionId ?? null,
    title: request.title ?? 'Requisição',
    method: request.method ?? 'GET',
    url: request.url ?? '',
    params: request.params ?? [],
    headers: migrateHeaders(request.headers),
    auth: { ...defaultAuth(), ...request.auth },
    body: request.body ?? '',
    preScript: request.preScript ?? '',
    postScript: request.postScript ?? '',
  }));

  const ids = new Set(requests.map((r) => r.id));
  // Arquivos antigos não têm abas abertas: abre a primeira requisição.
  const openRequestIds = state.openRequestIds
    ? state.openRequestIds.filter((id) => ids.has(id))
    : requests.slice(0, 1).map((r) => r.id);
  const activeRequestId =
    state.activeRequestId && openRequestIds.includes(state.activeRequestId)
      ? state.activeRequestId
      : openRequestIds[0] ?? null;

  return {
    collections: (state.collections ?? []).map((collection) => ({
      ...collection,
      baseUrl: normalizeBaseUrl(collection.baseUrl),
    })),
    requests,
    openRequestIds,
    activeRequestId,
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
