import type { ApiEndpoint, Collection, Folder, SavedRequest } from '../types';
import { endpointFromRequest } from './apiEndpoints';
import { resolveInherited } from './tree';

export const UNGROUPED_SCOPE = 'ungrouped';

export interface DocsScope {
  id: string;
  label: string;
  collection?: Collection;
}

export function docsScopeId(collectionId: string | null): string {
  return collectionId ?? UNGROUPED_SCOPE;
}

export function resolveDocsScopes(openDocIds: string[], collections: Collection[]): DocsScope[] {
  return openDocIds.flatMap((id): DocsScope[] => {
    if (id === UNGROUPED_SCOPE) return [{ id, label: 'Sem grupo' }];
    const collection = collections.find((c) => c.id === id);
    return collection ? [{ id, label: collection.name, collection }] : [];
  });
}

export function endpointsForScope(scope: DocsScope, requests: SavedRequest[], folders: Folder[]): ApiEndpoint[] {
  const collectionId = scope.collection?.id ?? null;
  return requests
    .filter((r) => (r.collectionId ?? null) === collectionId)
    .map((r) => {
      const resolved = resolveInherited(r, folders, scope.collection);
      return endpointFromRequest(resolved.request, resolved.collection);
    });
}
