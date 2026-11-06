import { useCallback, useMemo, useState } from 'react';
import { docsScopeId, resolveDocsScopes } from '../lib/apiDocsScope';
import type { DockLayout } from './useDockLayout';
import type { useWorkspace } from './useWorkspace';

/**
 * Endpoint a destacar na documentação. O nonce muda a cada pedido, para
 * rolar até o mesmo endpoint de novo mesmo que ele já esteja destacado.
 */
export interface DocsFocus {
  endpointId: string;
  nonce: number;
}

interface Deps {
  workspace: ReturnType<typeof useWorkspace>;
  dockActions: DockLayout['actions'];
}

/** Abas de documentação e a ligação delas com as abas de requisição. */
export function useApiDocs({ workspace, dockActions }: Deps) {
  const { state, actions, activeRequest } = workspace;
  const [focus, setFocus] = useState<DocsFocus | null>(null);

  const scopes = useMemo(
    () => resolveDocsScopes(state.openDocIds, state.collections),
    [state.openDocIds, state.collections]
  );

  /** Abre a documentação de uma coleção (null = sem grupo), opcionalmente indo até um endpoint. */
  const show = useCallback(
    (collectionId: string | null, endpointId?: string) => {
      actions.openDocs(docsScopeId(collectionId));
      if (endpointId) setFocus((prev) => ({ endpointId, nonce: (prev?.nonce ?? 0) + 1 }));
    },
    [actions]
  );

  /** Documentação da coleção da requisição ativa, já no endpoint dela (sem requisição: a primeira coleção). */
  const showForActiveRequest = useCallback(() => {
    if (activeRequest) show(activeRequest.collectionId, activeRequest.id);
    else show(state.collections[0]?.id ?? null);
  }, [activeRequest, state.collections, show]);

  /** "Testar": abre a requisição do endpoint no editor. */
  const tryIt = useCallback(
    (requestId: string) => {
      actions.openTab(requestId);
      dockActions.open('request');
    },
    [actions, dockActions]
  );

  return { scopes, activeId: state.activeDocId, focus, show, showForActiveRequest, tryIt };
}

export type ApiDocs = ReturnType<typeof useApiDocs>;
