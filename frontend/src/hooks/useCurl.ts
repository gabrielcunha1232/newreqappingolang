import { useCallback, useMemo, useState } from 'react';
import { parseCurl } from '../lib/curl/parseCurl';
import { toCurl } from '../lib/curl/toCurl';
import { paramsFromUrl } from '../lib/query';
import { resolveInherited } from '../lib/tree';
import { buildHttpRequest } from '../services/httpService';
import type { SavedRequest } from '../types';
import type { Logger } from './useConsole';
import type { ShowToast } from './useToast';
import type { useWorkspace } from './useWorkspace';

interface Deps {
  workspace: ReturnType<typeof useWorkspace>;
  /** Variáveis do ambiente ativo (o cURL copiado sai com elas resolvidas). */
  variables: Record<string, string>;
  log: Logger;
  notify: ShowToast;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Títulos que o app gera sozinho podem ser trocados pelo do cURL importado. */
function hasCustomTitle(request: SavedRequest): boolean {
  return request.title !== 'Nova requisição' && request.title !== `${request.method} ${request.url}`;
}

/** Importar (colar ou diálogo) e copiar requisições como cURL. */
export function useCurl({ workspace, variables, log, notify }: Deps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { state, actions, activeRequest } = workspace;

  const reportWarnings = useCallback(
    (warnings: string[]) => warnings.forEach((warning) => log('warn', `cURL: ${warning}`)),
    [log]
  );

  /** Colado no campo de URL: substitui método, URL, cabeçalhos, autorização e corpo da requisição ativa. */
  const pasteIntoActive = useCallback(
    (command: string) => {
      if (!activeRequest) return;
      try {
        const { request, warnings } = parseCurl(command);
        actions.updateRequest(activeRequest.id, {
          ...request,
          title: hasCustomTitle(activeRequest) ? activeRequest.title : request.title,
          params: paramsFromUrl(request.url, []),
          pathValues: {},
        });
        reportWarnings(warnings);
        log('ok', `cURL importado: ${request.method} ${request.url}`);
        notify(warnings.length > 0 ? `cURL importado com ${warnings.length} aviso(s). Veja o console.` : 'cURL importado.');
      } catch (err) {
        notify(`cURL inválido: ${errorMessage(err)}`);
      }
    },
    [activeRequest, actions, reportWarnings, log, notify]
  );

  /** Pelo diálogo: cria uma requisição nova. Lança Error para o diálogo mostrar. */
  const importAsNew = useCallback(
    (command: string) => {
      const { request, warnings } = parseCurl(command);
      actions.createRequest(null, request);
      setDialogOpen(false);
      reportWarnings(warnings);
      log('ok', `cURL importado: ${request.method} ${request.url}`);
      notify(warnings.length > 0 ? `Requisição criada com ${warnings.length} aviso(s). Veja o console.` : 'Requisição criada a partir do cURL.');
    },
    [actions, reportWarnings, log, notify]
  );

  /** Copia como cURL com variáveis, URL base e autorização já aplicadas. */
  const copyAsCurl = useCallback(
    (requestId: string | null) => {
      const request = state.requests.find((r) => r.id === requestId);
      if (!request) return;
      const collection = state.collections.find((c) => c.id === request.collectionId);
      const resolved = resolveInherited(request, state.folders, collection);
      const built = buildHttpRequest(resolved.request, resolved.collection, variables);
      if (!built.ok) {
        notify(built.error);
        return;
      }
      navigator.clipboard
        .writeText(toCurl(built.request))
        .then(() => notify('Copiado como cURL (bash).'))
        .catch(() => notify('Não foi possível copiar para a área de transferência.'));
    },
    [state.requests, state.collections, state.folders, variables, notify]
  );

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  return useMemo(
    () => ({ dialogOpen, openDialog, closeDialog, pasteIntoActive, importAsNew, copyAsCurl }),
    [dialogOpen, openDialog, closeDialog, pasteIntoActive, importAsNew, copyAsCurl]
  );
}
