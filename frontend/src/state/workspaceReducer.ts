import type { Endpoint } from '../../bindings/changeme/internal/models/models';
import { sourceFromScan } from '../lib/endpointSource';
import { newRequest, requestFromEndpoint } from '../lib/factories';
import { generateId } from '../lib/id';
import { applyRequestChanges, reconcileParams } from '../lib/query';
import { collectionNameFromPath, normalizeBaseUrl } from '../lib/url';
import { descendantFolderIds, inheritedAuthOwner, reorderTree, type TreeDragNode, type TreeDropTarget } from '../lib/tree';
import type { Collection, Folder, RequestAuth, SavedRequest } from '../types';

export interface WorkspaceState {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  /** Requisições abertas como abas, na ordem da barra de abas. */
  openRequestIds: string[];
  activeRequestId: string | null;
  /** Abas de documentação abertas: id da coleção ou UNGROUPED_SCOPE. */
  openDocIds: string[];
  /** Aba de documentação em primeiro plano; null = a requisição ativa está em primeiro plano. */
  activeDocId: string | null;
}

export type WorkspaceAction =
  | { type: 'hydrate'; state: WorkspaceState }
  | { type: 'request/create'; request: SavedRequest }
  | { type: 'request/update'; id: string; changes: Partial<SavedRequest> }
  | { type: 'request/duplicate'; id: string; newId: string }
  | { type: 'request/delete'; id: string }
  | { type: 'request/move'; id: string; collectionId: string | null; folderId: string | null }
  | { type: 'request/auth-renewed'; id: string; auth: RequestAuth }
  | { type: 'folder/create'; folder: Folder }
  | { type: 'folder/update'; id: string; changes: Partial<Folder> }
  | { type: 'folder/delete'; id: string }
  | { type: 'folder/move'; id: string; parentId: string | null }
  | { type: 'tree/reorder'; node: TreeDragNode; target: TreeDropTarget }
  | { type: 'tab/open'; id: string }
  | { type: 'tab/close'; id: string }
  | { type: 'tab/activate'; id: string }
  | { type: 'tab/close-active' }
  | { type: 'tab/close-many'; ids: string[] }
  | { type: 'docs/close-many'; ids: string[] }
  | { type: 'docs/open'; id: string }
  | { type: 'docs/close'; id: string }
  | { type: 'collection/create'; collection: Collection }
  | { type: 'collection/update'; id: string; changes: Partial<Collection> }
  | { type: 'collection/delete'; id: string }
  | { type: 'collection/import'; collection: Collection; requests: SavedRequest[]; folders: Folder[] }
  | { type: 'scanner/import'; dir: string; endpoints: Endpoint[]; baseUrl: string };

export function initialWorkspace(): WorkspaceState {
  const request = newRequest();
  return {
    collections: [],
    folders: [],
    requests: [request],
    openRequestIds: [request.id],
    activeRequestId: request.id,
    openDocIds: [],
    activeDocId: null,
  };
}

/** Abrir ou ativar uma requisição sempre a traz para frente da documentação. */
function openTab(state: WorkspaceState, id: string): WorkspaceState {
  return {
    ...state,
    openRequestIds: state.openRequestIds.includes(id)
      ? state.openRequestIds
      : [...state.openRequestIds, id],
    activeRequestId: id,
    activeDocId: null,
  };
}

function openDocs(state: WorkspaceState, id: string): WorkspaceState {
  return {
    ...state,
    openDocIds: state.openDocIds.includes(id) ? state.openDocIds : [...state.openDocIds, id],
    activeDocId: id,
  };
}

/** Fechar a documentação ativa ativa a vizinha; sem vizinha, volta para a requisição. */
function closeDocs(state: WorkspaceState, id: string): WorkspaceState {
  const index = state.openDocIds.indexOf(id);
  if (index === -1) return state;

  const openDocIds = state.openDocIds.filter((x) => x !== id);
  const activeDocId =
    state.activeDocId === id ? openDocIds[Math.min(index, openDocIds.length - 1)] ?? null : state.activeDocId;
  return { ...state, openDocIds, activeDocId };
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

  const findImported = (endpoint: Endpoint) =>
    state.requests.find(
      (r) => r.collectionId === collectionId && r.method === endpoint.method && r.url === endpoint.path
    );

  const imported = endpoints
    .filter((endpoint) => !findImported(endpoint))
    .map((endpoint) => requestFromEndpoint(endpoint, collectionId));

  // Requisições importadas antes de existir a origem (arquivo/linguagem) ganham ela ao reescanear.
  const sourceById = new Map(
    endpoints.flatMap((endpoint) => {
      const existingRequest = findImported(endpoint);
      return existingRequest && !existingRequest.source
        ? [[existingRequest.id, sourceFromScan(endpoint)] as const]
        : [];
    })
  );
  const requests = state.requests.map((r) => {
    const source = sourceById.get(r.id);
    return source ? { ...r, source } : r;
  });

  let collections = state.collections;
  if (!existing) {
    collections = [...collections, { id: collectionId, name, collapsed: false, baseUrl: base }];
  } else if (base && base !== existing.baseUrl) {
    // Reescaneou informando outra base: atualiza a coleção existente.
    collections = collections.map((c) => (c.id === collectionId ? { ...c, baseUrl: base } : c));
  }

  return { ...state, collections, requests: [...requests, ...imported] };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'request/create':
      return openTab(
        { ...state, requests: [...state.requests, reconcileParams(action.request)] },
        action.request.id
      );

    case 'request/update':
      return {
        ...state,
        requests: state.requests.map((r) => (r.id === action.id ? applyRequestChanges(r, action.changes) : r)),
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
          r.id === action.id ? { ...r, collectionId: action.collectionId, folderId: action.folderId } : r
        ),
      };

    case 'request/auth-renewed': {
      const request = state.requests.find((r) => r.id === action.id);
      const found = request && inheritedAuthOwner(request, state.folders, state.collections);
      if (!found) return state;
      const { kind, id } = found.owner;
      if (kind === 'request') {
        return { ...state, requests: state.requests.map((r) => (r.id === id ? { ...r, auth: action.auth } : r)) };
      }
      if (kind === 'folder') {
        return { ...state, folders: state.folders.map((f) => (f.id === id ? { ...f, auth: action.auth } : f)) };
      }
      return { ...state, collections: state.collections.map((c) => (c.id === id ? { ...c, auth: action.auth } : c)) };
    }

    case 'folder/create':
      return {
        ...state,
        folders: [
          ...state.folders.map((f) => (f.id === action.folder.parentId ? { ...f, collapsed: false } : f)),
          action.folder,
        ],
        collections: state.collections.map((c) =>
          c.id === action.folder.collectionId ? { ...c, collapsed: false } : c
        ),
      };

    case 'folder/update':
      return { ...state, folders: state.folders.map((f) => (f.id === action.id ? { ...f, ...action.changes } : f)) };

    case 'folder/delete': {
      const folder = state.folders.find((f) => f.id === action.id);
      if (!folder) return state;
      return {
        ...state,
        folders: state.folders
          .filter((f) => f.id !== action.id)
          .map((f) => (f.parentId === action.id ? { ...f, parentId: folder.parentId } : f)),
        requests: state.requests.map((r) => (r.folderId === action.id ? { ...r, folderId: folder.parentId } : r)),
      };
    }

    case 'folder/move':
      if (action.parentId && descendantFolderIds(action.id, state.folders).has(action.parentId)) return state;
      return {
        ...state,
        folders: state.folders.map((f) => (f.id === action.id ? { ...f, parentId: action.parentId } : f)),
      };

    case 'tree/reorder': {
      const result = reorderTree(state.folders, state.requests, action.node, action.target);
      return result ? { ...state, ...result } : state;
    }

    case 'tab/open':
      return openTab(state, action.id);

    case 'tab/close':
      return closeTab(state, action.id);

    case 'tab/activate':
      return { ...state, activeRequestId: action.id, activeDocId: null };

    case 'tab/close-active':
      if (state.activeDocId) return closeDocs(state, state.activeDocId);
      return state.activeRequestId ? closeTab(state, state.activeRequestId) : state;

    case 'tab/close-many':
      return action.ids.reduce(closeTab, state);

    case 'docs/close-many':
      return action.ids.reduce(closeDocs, state);

    case 'docs/open':
      return openDocs(state, action.id);

    case 'docs/close':
      return closeDocs(state, action.id);

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
        ...closeDocs(state, action.id),
        collections: state.collections.filter((c) => c.id !== action.id),
        folders: state.folders.filter((f) => f.collectionId !== action.id),
        requests: state.requests.map((r) =>
          r.collectionId === action.id ? { ...r, collectionId: null, folderId: null } : r
        ),
      };

    case 'collection/import':
      return {
        ...state,
        collections: [...state.collections, action.collection],
        folders: [...state.folders, ...action.folders],
        requests: [...state.requests, ...action.requests],
      };

    case 'scanner/import':
      return importEndpoints(state, action.dir, action.endpoints, action.baseUrl);
  }
}
