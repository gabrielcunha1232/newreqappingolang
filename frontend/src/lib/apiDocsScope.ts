import type { ApiEndpoint, Collection, SavedRequest } from '../types';
import { endpointFromRequest } from './apiEndpoints';

/** Escopo das requisições sem coleção. */
export const UNGROUPED_SCOPE = 'ungrouped';

/** O que uma aba de documentação mostra: uma coleção ou as requisições sem grupo. */
export interface DocsScope {
  id: string;
  label: string;
  collection?: Collection;
}

/** Id da aba de documentação para a coleção de uma requisição. */
export function docsScopeId(collectionId: string | null): string {
  return collectionId ?? UNGROUPED_SCOPE;
}

/** Abas de documentação abertas que ainda apontam para algo existente. */
export function resolveDocsScopes(openDocIds: string[], collections: Collection[]): DocsScope[] {
  return openDocIds.flatMap((id): DocsScope[] => {
    if (id === UNGROUPED_SCOPE) return [{ id, label: 'Sem grupo' }];
    const collection = collections.find((c) => c.id === id);
    return collection ? [{ id, label: collection.name, collection }] : [];
  });
}

export function endpointsForScope(scope: DocsScope, requests: SavedRequest[]): ApiEndpoint[] {
  const collectionId = scope.collection?.id ?? null;
  return requests
    .filter((r) => (r.collectionId ?? null) === collectionId)
    .map((r) => endpointFromRequest(r, scope.collection));
}
