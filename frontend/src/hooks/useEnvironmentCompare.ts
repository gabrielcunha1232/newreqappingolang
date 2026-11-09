import { useCallback, useMemo, useState } from 'react';
import type { Response } from '../../bindings/changeme/internal/models/models';
import { resolveInherited } from '../lib/tree';
import { variablesToMap } from '../lib/variables';
import { buildHttpRequest, sendHttpRequest } from '../services/httpService';
import type { Environment, SavedRequest } from '../types';
import type { useWorkspace } from './useWorkspace';

export interface CompareSide {
  response: Response | null;
  error: string;
  warnings: string[];
}

export function useEnvironmentCompare(workspace: ReturnType<typeof useWorkspace>) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const { state } = workspace;
  const request = state.requests.find((r) => r.id === requestId) ?? null;

  const runSide = useCallback(
    async (target: SavedRequest, environment: Environment): Promise<CompareSide> => {
      const collection = state.collections.find((c) => c.id === target.collectionId);
      const resolved = resolveInherited(target, state.folders, collection);
      const built = buildHttpRequest(resolved.request, resolved.collection, variablesToMap(environment.variables));
      if (!built.ok) return { response: null, error: built.error, warnings: [] };
      try {
        return { response: await sendHttpRequest(built.request), error: '', warnings: built.warnings };
      } catch (err) {
        return { response: null, error: err instanceof Error ? err.message : String(err), warnings: built.warnings };
      }
    },
    [state.collections, state.folders]
  );

  const run = useCallback(
    (target: SavedRequest, left: Environment, right: Environment) => Promise.all([runSide(target, left), runSide(target, right)]),
    [runSide]
  );

  const open = useCallback((id: string | null) => setRequestId(id), []);
  const close = useCallback(() => setRequestId(null), []);

  return useMemo(() => ({ request, open, close, run }), [request, open, close, run]);
}
