import { useCallback, useMemo, useRef, useState } from 'react';
import type { SavedRequest } from '../types';
import type { Logger } from './useConsole';
import type { RunResult, useRequestRunner } from './useRequestRunner';
import type { useWorkspace } from './useWorkspace';

export type RunItemState = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface RunItem {
  request: SavedRequest;
  selected: boolean;
  state: RunItemState;
  result?: RunResult;
}

export interface RunnerSession {
  title: string;
  collectionId: string | null;
  items: RunItem[];
  running: boolean;
  finished: boolean;
  delayMs: number;
  stopOnFailure: boolean;
}

interface Deps {
  workspace: ReturnType<typeof useWorkspace>;
  variables: Record<string, string>;
  runner: ReturnType<typeof useRequestRunner>;
  log: Logger;
}

/** Sem testes, vale o status HTTP; com testes, eles decidem (um 404 pode ser o esperado). */
export function runFailed(result: RunResult): boolean {
  if (result.error || result.scriptError) return true;
  if (result.tests.length > 0) return result.tests.some((test) => !test.passed);
  return result.status !== null && result.status >= 400;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Executa em sequência as requisições de uma coleção; as variáveis passam de uma para a outra. */
export function useCollectionRunner({ workspace, variables, runner, log }: Deps) {
  const [session, setSession] = useState<RunnerSession | null>(null);
  const stopRequested = useRef(false);
  const { state } = workspace;

  const open = useCallback(
    (collectionId: string | null) => {
      const requests = state.requests.filter((r) => r.collectionId === collectionId);
      const title = state.collections.find((c) => c.id === collectionId)?.name ?? 'Sem grupo';
      setSession({
        title,
        collectionId,
        items: requests.map((request) => ({ request, selected: true, state: 'pending' })),
        running: false,
        finished: false,
        delayMs: 0,
        stopOnFailure: false,
      });
    },
    [state.requests, state.collections]
  );

  const stop = useCallback(() => {
    stopRequested.current = true;
  }, []);

  const close = useCallback(() => {
    stopRequested.current = true;
    setSession(null);
  }, []);

  const toggle = useCallback((requestId: string) => {
    setSession((s) =>
      s && {
        ...s,
        items: s.items.map((item) => (item.request.id === requestId ? { ...item, selected: !item.selected } : item)),
      }
    );
  }, []);

  const setOptions = useCallback((options: Partial<Pick<RunnerSession, 'delayMs' | 'stopOnFailure'>>) => {
    setSession((s) => s && { ...s, ...options });
  }, []);

  const start = useCallback(async () => {
    if (!session || session.running) return;
    const { collectionId, delayMs, stopOnFailure, title } = session;
    const queue = session.items.filter((item) => item.selected).map((item) => item.request.id);
    const collection = state.collections.find((c) => c.id === collectionId);

    const update = (requestId: string, changes: Partial<RunItem>) =>
      setSession((s) => s && { ...s, items: s.items.map((i) => (i.request.id === requestId ? { ...i, ...changes } : i)) });

    stopRequested.current = false;
    setSession(
      (s) =>
        s && {
          ...s,
          running: true,
          finished: false,
          items: s.items.map(({ request, selected }) => ({
            request,
            selected,
            state: selected ? 'pending' : 'skipped',
          })),
        }
    );
    log('info', `Runner: iniciando "${title}" (${queue.length} requisição(ões)).`);

    let environment = variables;
    let passed = 0;
    let executed = 0;
    for (const [index, requestId] of queue.entries()) {
      if (stopRequested.current) break;
      const request = session.items.find((item) => item.request.id === requestId)!.request;
      update(requestId, { state: 'running' });

      const result = await runner.send(request, collection, environment);
      environment = result.environment;
      executed++;
      const failed = runFailed(result);
      if (!failed) passed++;
      update(requestId, { state: failed ? 'failed' : 'passed', result });

      if (failed && stopOnFailure) break;
      if (delayMs > 0 && index < queue.length - 1) await wait(delayMs);
    }

    log(passed === executed ? 'ok' : 'warn', `Runner: "${title}" terminou com ${passed} de ${executed} aprovada(s).`);
    setSession((s) => s && { ...s, running: false, finished: true });
  }, [session, state.collections, variables, runner, log]);

  return useMemo(
    () => ({ session, open, close, stop, start, toggle, setOptions }),
    [session, open, close, stop, start, toggle, setOptions]
  );
}

export type CollectionRunnerControls = ReturnType<typeof useCollectionRunner>;

/** Relatório sem cabeçalhos nem corpos, para não levar credenciais junto. */
export function runnerReport(session: RunnerSession): string {
  return JSON.stringify(
    {
      collection: session.title,
      generatedAt: new Date().toISOString(),
      results: session.items
        .filter((item) => item.result)
        .map(({ request, state, result }) => ({
          title: request.title,
          method: request.method,
          outcome: state,
          status: result?.status,
          timeMs: result?.timeSpent,
          error: result?.error || result?.scriptError || undefined,
          tests: result?.tests,
        })),
    },
    null,
    2
  );
}
