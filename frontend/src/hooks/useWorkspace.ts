import { useMemo, useReducer } from 'react';
import type { Endpoint } from '../../bindings/changeme/internal/models/models';
import { newRequest } from '../lib/factories';
import { generateId } from '../lib/id';
import type { TreeDragNode, TreeDropTarget } from '../lib/tree';
import { normalizeBaseUrl } from '../lib/url';
import { initialWorkspace, workspaceReducer, type WorkspaceState } from '../state/workspaceReducer';
import type { Collection, Folder, RequestAuth, SavedRequest } from '../types';

export function useWorkspace() {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, initialWorkspace);

  const actions = useMemo(
    () => ({
      hydrate: (next: WorkspaceState) => dispatch({ type: 'hydrate', state: next }),

      createRequest: (collectionId: string | null = null, initial: Partial<SavedRequest> = {}) =>
        dispatch({ type: 'request/create', request: { ...newRequest(collectionId), ...initial, id: generateId() } }),
      updateRequest: (id: string, changes: Partial<SavedRequest>) =>
        dispatch({ type: 'request/update', id, changes }),
      duplicateRequest: (id: string) =>
        dispatch({ type: 'request/duplicate', id, newId: generateId() }),
      deleteRequest: (id: string) => dispatch({ type: 'request/delete', id }),
      moveRequest: (id: string, collectionId: string | null, folderId: string | null = null) =>
        dispatch({ type: 'request/move', id, collectionId, folderId }),
      storeRenewedAuth: (id: string, auth: RequestAuth) => dispatch({ type: 'request/auth-renewed', id, auth }),
      reorderTree: (node: TreeDragNode, target: TreeDropTarget) => dispatch({ type: 'tree/reorder', node, target }),

      createFolder: (collectionId: string, parentId: string | null): string => {
        const id = generateId();
        dispatch({
          type: 'folder/create',
          folder: { id, collectionId, parentId, name: 'Nova pasta', collapsed: false, baseUrl: '' },
        });
        return id;
      },
      renameFolder: (id: string, name: string) => {
        const trimmed = name.trim();
        if (trimmed) dispatch({ type: 'folder/update', id, changes: { name: trimmed } });
      },
      setFolderBaseUrl: (id: string, baseUrl: string) =>
        dispatch({ type: 'folder/update', id, changes: { baseUrl: normalizeBaseUrl(baseUrl) } }),
      setFolderCollapsed: (id: string, collapsed: boolean) =>
        dispatch({ type: 'folder/update', id, changes: { collapsed } }),
      setFolderAuth: (id: string, auth: RequestAuth | undefined) =>
        dispatch({ type: 'folder/update', id, changes: { auth } }),
      deleteFolder: (id: string) => dispatch({ type: 'folder/delete', id }),
      moveFolder: (id: string, parentId: string | null) => dispatch({ type: 'folder/move', id, parentId }),

      openTab: (id: string) => dispatch({ type: 'tab/open', id }),
      closeTab: (id: string) => dispatch({ type: 'tab/close', id }),
      activateTab: (id: string) => dispatch({ type: 'tab/activate', id }),
      closeTabs: (ids: string[]) => dispatch({ type: 'tab/close-many', ids }),
      closeActiveTab: () => dispatch({ type: 'tab/close-active' }),
      moveTab: (id: string, toIndex: number) => dispatch({ type: 'tab/move', id, toIndex }),

      openDocs: (scopeId: string) => dispatch({ type: 'docs/open', id: scopeId }),
      closeDocs: (scopeId: string) => dispatch({ type: 'docs/close', id: scopeId }),
      closeManyDocs: (scopeIds: string[]) => dispatch({ type: 'docs/close-many', ids: scopeIds }),

      createCollection: (name: string, baseUrl = '') => {
        const trimmed = name.trim();
        if (!trimmed) return;
        dispatch({
          type: 'collection/create',
          collection: { id: generateId(), name: trimmed, collapsed: false, baseUrl: normalizeBaseUrl(baseUrl) },
        });
      },
      renameCollection: (id: string, name: string) => {
        const trimmed = name.trim();
        if (trimmed) dispatch({ type: 'collection/update', id, changes: { name: trimmed } });
      },
      setCollectionBaseUrl: (id: string, baseUrl: string) =>
        dispatch({ type: 'collection/update', id, changes: { baseUrl: normalizeBaseUrl(baseUrl) } }),
      setCollectionCollapsed: (id: string, collapsed: boolean) =>
        dispatch({ type: 'collection/update', id, changes: { collapsed } }),
      setCollectionGrouped: (id: string, groupByTag: boolean) =>
        dispatch({ type: 'collection/update', id, changes: { groupByTag } }),
      toggleCollectionGroup: (id: string, tag: string) => dispatch({ type: 'collection/toggle-group', id, tag }),
      setCollectionAuth: (id: string, auth: RequestAuth | undefined) =>
        dispatch({ type: 'collection/update', id, changes: { auth } }),
      deleteCollection: (id: string) => dispatch({ type: 'collection/delete', id }),

      importCollection: (collection: Collection, requests: SavedRequest[], folders: Folder[] = []) =>
        dispatch({ type: 'collection/import', collection, requests, folders }),

      importEndpoints: (dir: string, endpoints: Endpoint[], baseUrl = '') =>
        dispatch({ type: 'scanner/import', dir, endpoints, baseUrl }),
    }),
    []
  );

  const activeRequest = state.requests.find((r) => r.id === state.activeRequestId) ?? null;

  return { state, activeRequest, actions };
}

export type WorkspaceActions = ReturnType<typeof useWorkspace>['actions'];
