import { useCallback, useMemo, useRef, useState } from 'react';
import type { RunnerData } from '../lib/runnerData';
import { responseSchemaIssues, type SchemaIssue } from '../lib/schemaValidation';
import { folderChain, requestsInTreeOrder, resolveInherited } from '../lib/tree';
import type { SavedRequest } from '../types';
import type { Logger } from './useConsole';
import type { RunResult, useRequestRunner } from './useRequestRunner';
import type { useWorkspace } from './useWorkspace';

export type RunItemState = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface RunEntry {
  iteration: number;
  passed: boolean;
  result: RunResult;
  schemaIssues: SchemaIssue[];
}

export interface RunItem {
  request: SavedRequest;
  selected: boolean;
  state: RunItemState;
  result?: RunResult;
  runs: RunEntry[];
}

export interface RunnerSession {
  title: string;
  collectionId: string | null;
  items: RunItem[];
  running: boolean;
  finished: boolean;
  delayMs: number;
  stopOnFailure: boolean;
  data: RunnerData | null;
  validateSchema: boolean;
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
  const latestState = useRef(state);
  latestState.current = state;

  const open = useCallback(
    (collectionId: string | null, folderId: string | null = null) => {
      const requests = requestsInTreeOrder(collectionId, folderId, state.folders, state.requests);
      const title =
        folderChain(folderId, state.folders)[0]?.name ??
        state.collections.find((c) => c.id === collectionId)?.name ??
        'Sem grupo';
      setSession({
        title,
        collectionId,
        items: requests.map((request) => ({ request, selected: true, state: 'pending', runs: [] })),
        running: false,
        finished: false,
        delayMs: 0,
        stopOnFailure: false,
        data: null,
        validateSchema: false,
      });
    },
    [state.requests, state.collections, state.folders]
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

  const setOptions = useCallback((options: Partial<Pick<RunnerSession, 'delayMs' | 'stopOnFailure' | 'data' | 'validateSchema'>>) => {
    setSession((s) => s && { ...s, ...options });
  }, []);

  const start = useCallback(async () => {
    if (!session || session.running) return;
    const { collectionId, delayMs, stopOnFailure, title, data, validateSchema } = session;
    const queue = session.items.filter((item) => item.selected).map((item) => item.request.id);
    const rows = data?.rows ?? [undefined];

    const update = (requestId: string, change: (item: RunItem) => Partial<RunItem>) =>
      setSession((s) => s && { ...s, items: s.items.map((i) => (i.request.id === requestId ? { ...i, ...change(i) } : i)) });

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
            runs: [],
          })),
        }
    );
    const volume = data ? ` × ${rows.length} linha(s) de ${data.fileName}` : '';
    log('info', `Runner: iniciando "${title}" (${queue.length} requisição(ões)${volume}).`);

    let environment = variables;
    let passed = 0;
    let executed = 0;
    let halted = false;
    for (const [iteration, row] of rows.entries()) {
      if (halted) break;
      if (data && !stopRequested.current) log('info', `Runner: linha ${iteration + 1} de ${rows.length}.`);
      for (const [index, requestId] of queue.entries()) {
        if (stopRequested.current) {
          halted = true;
          break;
        }
        const request = session.items.find((item) => item.request.id === requestId)!.request;
        update(requestId, () => ({ state: 'running' }));

        const current = latestState.current;
        const resolved = resolveInherited(
          request,
          current.folders,
          current.collections.find((c) => c.id === collectionId)
        );
        const { body, ...outcome } = await runner.send(resolved.request, resolved.collection, environment, row);
        const result = { ...outcome, body: '' };
        environment = result.environment;
        executed++;
        const doc = latestState.current.requests.find((item) => item.id === requestId)?.doc;
        const schemaIssues = validateSchema && !result.error ? responseSchemaIssues(doc, result.status, body) : [];
        const failed = runFailed(result) || schemaIssues.length > 0;
        if (!failed) passed++;
        update(requestId, (item) => {
          const runs = [...item.runs, { iteration, passed: !failed, result, schemaIssues }];
          return { state: runs.every((run) => run.passed) ? 'passed' : 'failed', result, runs };
        });

        if (failed && stopOnFailure) {
          halted = true;
          break;
        }
        const last = iteration === rows.length - 1 && index === queue.length - 1;
        if (delayMs > 0 && !last) await wait(delayMs);
      }
    }

    log(passed === executed ? 'ok' : 'warn', `Runner: "${title}" terminou com ${passed} de ${executed} aprovada(s).`);
    setSession((s) => s && { ...s, running: false, finished: true });
  }, [session, variables, runner, log]);

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
      dataFile: session.data?.fileName,
      results: session.items.flatMap(({ request, runs }) =>
        runs.map(({ iteration, passed, result, schemaIssues }) => ({
          title: request.title,
          method: request.method,
          line: session.data ? iteration + 1 : undefined,
          outcome: passed ? 'passed' : 'failed',
          status: result.status,
          timeMs: result.timeSpent,
          error: result.error || result.scriptError || undefined,
          tests: result.tests,
          schemaIssues: schemaIssues.length > 0 ? schemaIssues : undefined,
        }))
      ),
    },
    null,
    2
  );
}
