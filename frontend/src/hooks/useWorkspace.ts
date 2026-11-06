import { useMemo, useReducer } from 'react';
import type { Endpoint } from '../../bindings/changeme/internal/models/models';
import { newRequest } from '../lib/factories';
import { generateId } from '../lib/id';
import { normalizeBaseUrl } from '../lib/url';
import { initialWorkspace, workspaceReducer, type WorkspaceState } from '../state/workspaceReducer';
import type { Collection, SavedRequest } from '../types';

/** Estado de coleções, requisições e abas abertas, com ações nomeadas. */
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
      moveRequest: (id: string, collectionId: string | null) =>
        dispatch({ type: 'request/move', id, collectionId }),

      openTab: (id: string) => dispatch({ type: 'tab/open', id }),
      closeTab: (id: string) => dispatch({ type: 'tab/close', id }),
      activateTab: (id: string) => dispatch({ type: 'tab/activate', id }),
      /** Fecha várias abas de requisição ("fechar outras", "fechar à direita"...). */
      closeTabs: (ids: string[]) => dispatch({ type: 'tab/close-many', ids }),
      /** Fecha a aba em primeiro plano (documentação ou requisição). */
      closeActiveTab: () => dispatch({ type: 'tab/close-active' }),

      /** Abre (ou traz para frente) a aba de documentação de uma coleção ou de UNGROUPED_SCOPE. */
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
      deleteCollection: (id: string) => dispatch({ type: 'collection/delete', id }),

      /** Adiciona uma coleção já montada (ex.: importada de uma spec OpenAPI). */
      importCollection: (collection: Collection, requests: SavedRequest[]) =>
        dispatch({ type: 'collection/import', collection, requests }),

      importEndpoints: (dir: string, endpoints: Endpoint[], baseUrl = '') =>
        dispatch({ type: 'scanner/import', dir, endpoints, baseUrl }),
    }),
    []
  );

  const activeRequest = state.requests.find((r) => r.id === state.activeRequestId) ?? null;

  return { state, activeRequest, actions };
}

export type WorkspaceActions = ReturnType<typeof useWorkspace>['actions'];
