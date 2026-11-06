import { useCallback, useMemo } from 'react';
import type { Endpoint } from '../../bindings/changeme/internal/models/models';
import { downloadText } from '../lib/download';
import { requestFromEndpoint } from '../lib/factories';
import { logsToText } from '../lib/format';
import type { AppSnapshot } from '../services/persistenceService';
import { initialWorkspace } from '../state/workspaceReducer';
import type { HistoryEntry, SavedRequest } from '../types';
import type { useConsole } from './useConsole';
import type { useEnvironments } from './useEnvironments';
import type { useHistory } from './useHistory';
import type { useRequestRunner } from './useRequestRunner';
import type { useToast } from './useToast';
import type { useWorkspace } from './useWorkspace';

interface Deps {
  workspace: ReturnType<typeof useWorkspace>;
  environments: ReturnType<typeof useEnvironments>;
  history: ReturnType<typeof useHistory>;
  logger: ReturnType<typeof useConsole>;
  runner: ReturnType<typeof useRequestRunner>;
  toast: ReturnType<typeof useToast>;
}

/** Casos de uso que combinam mais de um hook de estado (enviar, importar, persistir...). */
export function useWorkspaceHandlers({ workspace, environments, history, logger, runner, toast }: Deps) {
  const { state, activeRequest, actions } = workspace;

  /* ===== Persistência ===== */

  const snapshot = useMemo<AppSnapshot>(
    () => ({
      ...state,
      environments: environments.environments,
      activeEnvironmentId: environments.activeId,
      history: history.entries,
    }),
    [state, environments.environments, environments.activeId, history.entries]
  );

  const hydrate = useCallback(
    (loaded: AppSnapshot) => {
      if (loaded.requests.length > 0) {
        actions.hydrate({
          collections: loaded.collections,
          requests: loaded.requests,
          openRequestIds: loaded.openRequestIds,
          activeRequestId: loaded.activeRequestId,
          openDocIds: loaded.openDocIds,
          activeDocId: loaded.activeDocId,
        });
      } else {
        actions.hydrate({
          ...initialWorkspace(),
          collections: loaded.collections,
          openDocIds: loaded.openDocIds,
          activeDocId: loaded.activeDocId,
        });
      }
      environments.actions.hydrate(loaded.environments, loaded.activeEnvironmentId);
      history.actions.hydrate(loaded.history);
    },
    [actions, environments.actions, history.actions]
  );

  /* ===== Requisição ativa ===== */

  const openTabs = useMemo(
    () =>
      state.openRequestIds
        .map((id) => state.requests.find((r) => r.id === id))
        .filter((r): r is SavedRequest => Boolean(r)),
    [state.openRequestIds, state.requests]
  );

  const updateActiveRequest = useCallback(
    (changes: Partial<SavedRequest>) => {
      if (activeRequest) actions.updateRequest(activeRequest.id, changes);
    },
    [actions, activeRequest]
  );

  const sendActiveRequest = useCallback(() => {
    if (!activeRequest) return;
    const collection = state.collections.find((c) => c.id === activeRequest.collectionId);
    void runner.send(activeRequest, collection, environments.variables);
  }, [activeRequest, state.collections, runner, environments.variables]);

  const copyActiveResponse = useCallback(() => {
    const body = runner.get(state.activeRequestId).response?.body ?? '';
    navigator.clipboard
      .writeText(body)
      .then(() => toast.show('Resposta copiada.'))
      .catch(() => toast.show('Não foi possível copiar a resposta.'));
  }, [runner, state.activeRequestId, toast]);

  const saveLogs = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadText(`forkarsenet-logs-${stamp}.txt`, logsToText(logger.entries));
    toast.show('Logs salvos.');
  }, [logger.entries, toast]);

  /* ===== Histórico e scanner ===== */

  const openHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      const existing = state.requests.find((r) => r.id === entry.requestId);
      if (existing) {
        actions.openTab(existing.id);
      } else {
        actions.createRequest(null, { method: entry.method, url: entry.url, title: `${entry.method} ${entry.url}` });
      }
    },
    [actions, state.requests]
  );

  const importScan = useCallback(
    (dir: string, endpoints: Endpoint[], baseUrl: string) => {
      actions.importEndpoints(dir, endpoints, baseUrl);
      if (endpoints.length > 0) {
        logger.log('ok', `Scanner: ${endpoints.length} endpoint(s) encontrados em ${dir}`);
        toast.show(`${endpoints.length} endpoint(s) importados para a coleção.`);
      } else {
        logger.log('warn', `Scanner: nenhum endpoint encontrado em ${dir}`);
      }
    },
    [actions, logger, toast]
  );

  // Clicar num endpoint já importado apenas abre a aba dele.
  const openEndpoint = useCallback(
    (endpoint: Endpoint) => {
      const existing = state.requests.find((r) => r.method === endpoint.method && r.url === endpoint.path);
      if (existing) {
        actions.openTab(existing.id);
      } else {
        actions.createRequest(null, requestFromEndpoint(endpoint, null));
      }
    },
    [actions, state.requests]
  );

  /* ===== Atalhos ===== */

  const shortcuts = useMemo(
    () => ({
      newRequest: () => actions.createRequest(),
      closeTab: actions.closeActiveTab,
    }),
    [actions]
  );

  return {
    snapshot,
    hydrate,
    openTabs,
    updateActiveRequest,
    sendActiveRequest,
    copyActiveResponse,
    saveLogs,
    openHistoryEntry,
    importScan,
    openEndpoint,
    shortcuts,
  };
}
