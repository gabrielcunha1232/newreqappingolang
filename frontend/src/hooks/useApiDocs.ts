import { useCallback, useMemo, useState } from 'react';
import { docsScopeId, endpointsForScope, resolveDocsScopes, type DocsScope } from '../lib/apiDocsScope';
import { downloadText } from '../lib/download';
import { buildOpenApiDocument, openApiFileName } from '../lib/openapi/exportOpenApi';
import type { Logger } from './useConsole';
import type { DockLayout } from './useDockLayout';
import type { ShowToast } from './useToast';
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
  /** Variáveis do ambiente ativo (resolvem {{baseUrl}} no export). */
  variables: Record<string, string>;
  log: Logger;
  notify: ShowToast;
}

/** Abas de documentação e a ligação delas com as abas de requisição. */
export function useApiDocs({ workspace, dockActions, variables, log, notify }: Deps) {
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

  /** Baixa a documentação da aba como OpenAPI 3 (JSON); avisos vão para o console. */
  const exportOpenApi = useCallback(
    (scope: DocsScope) => {
      const endpoints = endpointsForScope(scope, state.requests, state.folders);
      const { document, warnings } = buildOpenApiDocument({ title: scope.label, endpoints, variables });
      const fileName = openApiFileName(scope.label);

      downloadText(fileName, JSON.stringify(document, null, 2));
      log('ok', `OpenAPI: ${Object.keys(document.paths).length} caminho(s) de "${scope.label}" exportados para ${fileName}`);
      warnings.forEach((warning) => log('warn', `OpenAPI: ${warning}`));
      notify(
        warnings.length > 0
          ? `OpenAPI exportado com ${warnings.length} aviso(s). Veja o console.`
          : 'OpenAPI exportado.'
      );
    },
    [state.requests, state.folders, variables, log, notify]
  );

  /** Exporta direto da árvore de coleções, sem abrir a documentação. */
  const exportCollection = useCallback(
    (collectionId: string | null) => {
      const [scope] = resolveDocsScopes([docsScopeId(collectionId)], state.collections);
      if (scope) exportOpenApi(scope);
    },
    [state.collections, exportOpenApi]
  );

  return { scopes, activeId: state.activeDocId, focus, show, showForActiveRequest, tryIt, exportOpenApi, exportCollection };
}

export type ApiDocs = ReturnType<typeof useApiDocs>;
