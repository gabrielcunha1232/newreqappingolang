import { useCallback, useMemo, useState } from 'react';
import type { CurlSource } from '../lib/curl/toCurl';
import { buildHttpRequest } from '../services/httpService';
import type { ShowToast } from './useToast';
import type { useWorkspace } from './useWorkspace';

interface Deps {
  workspace: ReturnType<typeof useWorkspace>;
  /** O código sai com as variáveis já resolvidas, como no "Copiar como cURL". */
  variables: Record<string, string>;
  notify: ShowToast;
}

export function useCodeGeneration({ workspace, variables, notify }: Deps) {
  const [source, setSource] = useState<CurlSource | null>(null);
  const { state } = workspace;

  const open = useCallback(
    (requestId: string | null) => {
      const request = state.requests.find((r) => r.id === requestId);
      if (!request) return;
      const collection = state.collections.find((c) => c.id === request.collectionId);
      const built = buildHttpRequest(request, collection, variables);
      if (built.ok) setSource(built.request);
      else notify(built.error);
    },
    [state.requests, state.collections, variables, notify]
  );

  const close = useCallback(() => setSource(null), []);

  return useMemo(() => ({ source, open, close }), [source, open, close]);
}
