import { useCallback, useState } from 'react';
import { formatBytes, statusLabel } from '../lib/format';
import { buildHttpRequest, sendHttpRequest } from '../services/httpService';
import type { Collection, HistoryEntry, RequestRuntime, SavedRequest } from '../types';
import type { Logger } from './useConsole';

const IDLE: RequestRuntime = { response: null, error: '', loading: false };

interface RunnerDeps {
  log: Logger;
  onComplete: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
}

/** Executa requisições e guarda resposta/erro/carregamento por requisição. */
export function useRequestRunner({ log, onComplete }: RunnerDeps) {
  const [runtime, setRuntime] = useState<Record<string, RequestRuntime>>({});

  const patch = useCallback((id: string, changes: Partial<RequestRuntime>) => {
    setRuntime((prev) => ({ ...prev, [id]: { ...(prev[id] ?? IDLE), ...changes } }));
  }, []);

  const send = useCallback(
    async (saved: SavedRequest, collection: Collection | undefined, vars: Record<string, string>) => {
      const built = buildHttpRequest(saved, collection, vars);
      if (!built.ok) {
        patch(saved.id, { error: built.error, response: null, loading: false });
        log('error', built.error);
        return;
      }

      const { request, warnings } = built;
      warnings.forEach((w) => log('warn', w));
      log('info', `Enviando ${request.method} ${request.url}`);
      patch(saved.id, { error: '', response: null, loading: true });

      try {
        const response = await sendHttpRequest(request);
        patch(saved.id, { response, loading: false });
        log(
          response.status_code < 400 ? 'ok' : 'warn',
          `${statusLabel(response.status_code)} · ${response.time_spent} ms · ${formatBytes(response.size)}`
        );
        onComplete({
          requestId: saved.id,
          method: request.method,
          url: request.url,
          status: response.status_code,
          timeSpent: response.time_spent,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        patch(saved.id, { error: message, loading: false });
        log('error', `Falha na requisição: ${message}`);
      }
    },
    [log, onComplete, patch]
  );

  const get = useCallback((id: string | null) => (id && runtime[id]) || IDLE, [runtime]);

  return { get, send };
}
