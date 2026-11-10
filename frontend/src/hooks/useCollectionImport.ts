import { useCallback, useMemo, useState } from 'react';
import { importCollectionText } from '../lib/importers';
import type { Logger } from './useConsole';
import type { useEnvironments } from './useEnvironments';
import type { ShowToast } from './useToast';
import type { useWorkspace } from './useWorkspace';

interface Deps {
  workspace: ReturnType<typeof useWorkspace>;
  environments: ReturnType<typeof useEnvironments>;
  log: Logger;
  notify: ShowToast;
}

export function useCollectionImport({ workspace, environments, log, notify }: Deps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { state, actions } = workspace;
  const addEnvironment = environments.actions.add;

  const importText = useCallback(
    (content: string, origin: string) => {
      const result = importCollectionText(content, state.collections.map((c) => c.name));
      const { collection, requests, folders, environment, warnings } = result;

      actions.importCollection(collection, requests, folders);
      if (environment) addEnvironment(environment.name, environment.variables);
      setDialogOpen(false);

      log('ok', `Importação: "${collection.name}" de ${origin} (${requests.length} requisição(ões)).`);
      if (environment) log('info', `Importação: ambiente "${environment.name}" criado e ativado.`);
      warnings.forEach((warning) => log('warn', `Importação: ${warning}`));
      notify(
        warnings.length > 0
          ? `"${collection.name}" importada com ${warnings.length} aviso(s). Veja o console.`
          : `"${collection.name}" importada.`
      );
    },
    [state.collections, actions, addEnvironment, log, notify]
  );

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  return useMemo(
    () => ({ dialogOpen, openDialog, closeDialog, importText }),
    [dialogOpen, openDialog, closeDialog, importText]
  );
}
