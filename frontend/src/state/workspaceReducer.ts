import type { Endpoint } from '../../bindings/changeme/internal/models/models';
import { newRequest, requestFromEndpoint } from '../lib/factories';
import { generateId } from '../lib/id';
import { collectionNameFromPath, normalizeBaseUrl } from '../lib/url';
import type { Collection, SavedRequest } from '../types';

export interface WorkspaceState {
  collections: Collection[];
  requests: SavedRequest[];
  /** Requisições abertas como abas, na ordem da barra de abas. */
  openRequestIds: string[];
  activeRequestId: string | null;
}

export type WorkspaceAction =
  | { type: 'hydrate'; state: WorkspaceState }
  | { type: 'request/create'; request: SavedRequest }
  | { type: 'request/update'; id: string; changes: Partial<SavedRequest> }
  | { type: 'request/duplicate'; id: string; newId: string }
  | { type: 'request/delete'; id: string }
  | { type: 'request/move'; id: string; collectionId: string | null }
  | { type: 'tab/open'; id: string }
  | { type: 'tab/close'; id: string }
  | { type: 'tab/activate'; id: string }
  | { type: 'collection/create'; collection: Collection }
  | { type: 'collection/update'; id: string; changes: Partial<Collection> }
  | { type: 'collection/delete'; id: string }
  | { type: 'scanner/import'; dir: string; endpoints: Endpoint[]; baseUrl: string };

export function initialWorkspace(): WorkspaceState {
  const request = newRequest();
  return {
    collections: [],
    requests: [request],
    openRequestIds: [request.id],
    activeRequestId: request.id,
  };
}

function openTab(state: WorkspaceState, id: string): WorkspaceState {
  return {
    ...state,
    openRequestIds: state.openRequestIds.includes(id)
      ? state.openRequestIds
      : [...state.openRequestIds, id],
    activeRequestId: id,
  };
}

function closeTab(state: WorkspaceState, id: string): WorkspaceState {
  const index = state.openRequestIds.indexOf(id);
  if (index === -1) return state;

  const openRequestIds = state.openRequestIds.filter((x) => x !== id);
  const activeRequestId =
    state.activeRequestId === id
      ? openRequestIds[Math.min(index, openRequestIds.length - 1)] ?? null
      : state.activeRequestId;
  return { ...state, openRequestIds, activeRequestId };
}

// Ao escanear: cria (ou reutiliza) a coleção com o nome da pasta e importa
// todos os endpoints encontrados como requisições, sem duplicar.
function importEndpoints(
  state: WorkspaceState,
  dir: string,
  endpoints: Endpoint[],
  rawBaseUrl: string
): WorkspaceState {
  if (endpoints.length === 0) return state;

  const base = normalizeBaseUrl(rawBaseUrl);
  const name = collectionNameFromPath(dir);
  const existing = state.collections.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const collectionId = existing?.id ?? generateId();

  const imported = endpoints
    .filter(
      (endpoint) =>
        !state.requests.some(
          (r) =>
            r.collectionId === collectionId &&
            r.method === endpoint.method &&
            r.url === endpoint.path
        )
    )
    .map((endpoint) => requestFromEndpoint(endpoint, collectionId));

  let collections = state.collections;
  if (!existing) {
    collections = [...collections, { id: collectionId, name, collapsed: false, baseUrl: base }];
  } else if (base && base !== existing.baseUrl) {
    // Reescaneou informando outra base: atualiza a coleção existente.
    collections = collections.map((c) => (c.id === collectionId ? { ...c, baseUrl: base } : c));
  }

  return { ...state, collections, requests: [...state.requests, ...imported] };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'request/create':
      return openTab({ ...state, requests: [...state.requests, action.request] }, action.request.id);

    case 'request/update':
      return {
        ...state,
        requests: state.requests.map((r) => (r.id === action.id ? { ...r, ...action.changes } : r)),
      };

    case 'request/duplicate': {
      const source = state.requests.find((r) => r.id === action.id);
      if (!source) return state;
      const copy: SavedRequest = {
        ...structuredClone(source),
        id: action.newId,
        title: `${source.title} (cópia)`,
      };
      return openTab({ ...state, requests: [...state.requests, copy] }, copy.id);
    }

    case 'request/delete':
      return {
        ...closeTab(state, action.id),
        requests: state.requests.filter((r) => r.id !== action.id),
      };

    case 'request/move':
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.id ? { ...r, collectionId: action.collectionId } : r
        ),
      };

    case 'tab/open':
      return openTab(state, action.id);

    case 'tab/close':
      return closeTab(state, action.id);

    case 'tab/activate':
      return { ...state, activeRequestId: action.id };

    case 'collection/create':
      return { ...state, collections: [...state.collections, action.collection] };

    case 'collection/update':
      return {
        ...state,
        collections: state.collections.map((c) =>
          c.id === action.id ? { ...c, ...action.changes } : c
        ),
      };

    case 'collection/delete':
      // As requisições da coleção excluída vão para "Sem grupo".
      return {
        ...state,
        collections: state.collections.filter((c) => c.id !== action.id),
        requests: state.requests.map((r) =>
          r.collectionId === action.id ? { ...r, collectionId: null } : r
        ),
      };

    case 'scanner/import':
      return importEndpoints(state, action.dir, action.endpoints, action.baseUrl);
  }
}
