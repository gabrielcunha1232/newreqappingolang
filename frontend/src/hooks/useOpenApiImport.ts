import { useCallback, useMemo, useState } from 'react';
import { importOpenApi } from '../lib/openapi/importOpenApi';
import { parseSpecText } from '../lib/openapi/parseSpec';
import { fetchSpecText } from '../services/specService';
import type { Logger } from './useConsole';
import type { ShowToast } from './useToast';
import type { useWorkspace } from './useWorkspace';

interface Deps {
  workspace: ReturnType<typeof useWorkspace>;
  log: Logger;
  notify: ShowToast;
}

export function useOpenApiImport({ workspace, log, notify }: Deps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { state, actions } = workspace;

  const importText = useCallback(
    (text: string, origin: string, sourceUrl?: string) => {
      const spec = parseSpecText(text);
      const { collection, requests, warnings } = importOpenApi(spec, {
        sourceUrl,
        existingNames: state.collections.map((c) => c.name),
      });

      actions.importCollection(collection, requests);
      actions.openDocs(collection.id);
      setDialogOpen(false);

      log('ok', `OpenAPI: "${collection.name}" importada de ${origin} (${requests.length} requisição(ões)).`);
      warnings.forEach((warning) => log('warn', `OpenAPI: ${warning}`));
      notify(
        warnings.length > 0
          ? `"${collection.name}" importada com ${warnings.length} aviso(s). Veja o console.`
          : `"${collection.name}" importada.`
      );
    },
    [state.collections, actions, log, notify]
  );

  const importUrl = useCallback(
    async (url: string) => {
      const text = await fetchSpecText(url);
      importText(text, url, url.trim());
    },
    [importText]
  );

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  return useMemo(
    () => ({ dialogOpen, openDialog, closeDialog, importText, importUrl }),
    [dialogOpen, openDialog, closeDialog, importText, importUrl]
  );
}
