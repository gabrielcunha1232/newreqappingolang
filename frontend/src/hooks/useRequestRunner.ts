import { useCallback, useState } from 'react';
import type { Request } from '../../bindings/changeme/internal/models/models';
import { formatBytes, statusLabel } from '../lib/format';
import {
  applyEnvironmentChanges,
  applyScriptRequest,
  scriptRequestFromSaved,
  scriptRequestFromSent,
  scriptResponseFrom,
} from '../lib/scripts/snapshots';
import type { ScriptLog, ScriptOutput, TestResult } from '../lib/scripts/types';
import { maskHeaderValue } from '../lib/secrets';
import { buildHttpRequest, sendHttpRequest } from '../services/httpService';
import { renewTokenIfNeeded } from '../services/oauthService';
import { executeScript } from '../services/scriptService';
import type { Collection, HistoryEntry, LogLevel, RequestAuth, RequestRuntime, SavedRequest } from '../types';
import type { Logger } from './useConsole';

const IDLE: RequestRuntime = { response: null, previous: null, error: '', loading: false, tests: null, scriptError: '' };

const SCRIPT_LOG_LEVEL: Record<ScriptLog['level'], LogLevel> = { info: 'info', warn: 'warn', error: 'error' };

/** O que aconteceu num envio (usado também pelo Collection Runner). */
export interface RunResult {
  status: number | null;
  timeSpent: number | null;
  error: string;
  tests: TestResult[];
  /** Erro que interrompeu o script de pós-processamento. */
  scriptError: string;
  /** Variáveis do ambiente depois dos scripts (para a próxima requisição de uma sequência). */
  environment: Record<string, string>;
}

interface RunnerDeps {
  log: Logger;
  onComplete: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  /** Grava no ambiente ativo o que os scripts mudaram; false = não há ambiente ativo. */
  onEnvironmentChanges: (changes: Record<string, string | null>) => boolean;
  /** Grava na requisição o token OAuth2 renovado no envio. */
  onAuthRenewed: (requestId: string, auth: RequestAuth) => void;
}

/**
 * Executa requisições: pré-processamento → montagem → envio → pós-processamento.
 * Guarda resposta, erro, carregamento e testes por requisição.
 */
export function useRequestRunner({ log, onComplete, onEnvironmentChanges, onAuthRenewed }: RunnerDeps) {
  const [runtime, setRuntime] = useState<Record<string, RequestRuntime>>({});

  const patch = useCallback((id: string, changes: Partial<RequestRuntime>) => {
    setRuntime((prev) => ({ ...prev, [id]: { ...(prev[id] ?? IDLE), ...changes } }));
  }, []);

  const reportScript = useCallback(
    (label: string, output: ScriptOutput) => {
      output.logs.forEach((entry) => log(SCRIPT_LOG_LEVEL[entry.level], `[${label}] ${entry.message}`));
    },
    [log]
  );

  const logRequest = useCallback(
    (saved: SavedRequest, request: Request) => {
      log('info', `Enviando ${request.method} ${request.url}`);
      const apiKeyHeader = saved.auth.type === 'apikey' ? saved.auth.apiKeyName.trim().toLowerCase() : '';
      for (const [name, value] of Object.entries(request.headers)) {
        const masked = maskHeaderValue(name, value ?? '', name.toLowerCase() === apiKeyHeader);
        log('info', `  ${name}: ${masked}`);
      }
      if (request.body) log('info', `  Corpo: ${formatBytes(new TextEncoder().encode(request.body).length)}`);
    },
    [log]
  );

  const send = useCallback(
    async (saved: SavedRequest, collection: Collection | undefined, envVars: Record<string, string>): Promise<RunResult> => {
      let environment = envVars;
      let locals: Record<string, string> = {};
      let effective = saved;

      const result = (changes: Partial<RunResult>): RunResult => ({
        status: null,
        timeSpent: null,
        error: '',
        tests: [],
        scriptError: '',
        environment,
        ...changes,
      });

      const fail = (message: string): RunResult => {
        patch(saved.id, { error: message, response: null, loading: false });
        log('error', message);
        return result({ error: message });
      };

      const applyEnvironment = (changes: Record<string, string | null>) => {
        if (Object.keys(changes).length === 0) return;
        environment = applyEnvironmentChanges(environment, changes);
        if (!onEnvironmentChanges(changes)) {
          log('warn', 'O script alterou variáveis de ambiente, mas não há ambiente ativo: valem só para esta execução.');
        }
      };

      setRuntime((prev) => {
        const current = prev[saved.id] ?? IDLE;
        return {
          ...prev,
          [saved.id]: {
            ...current,
            error: '',
            response: null,
            previous: current.response ?? current.previous,
            loading: true,
            tests: null,
            scriptError: '',
          },
        };
      });

      /* 1. Pré-processamento: pode mudar a requisição e as variáveis antes da montagem. */
      if (saved.preScript.trim()) {
        const output = await executeScript({
          phase: 'pre',
          code: saved.preScript,
          request: scriptRequestFromSaved(saved),
          environment,
          variables: locals,
        });
        reportScript('pré', output);
        if (output.error) return fail(`Erro no script de pré-processamento: ${output.error}`);
        applyEnvironment(output.environmentChanges);
        locals = output.variables;
        effective = applyScriptRequest(saved, output.request);
      }

      /* OAuth2: renova o token vencido antes de montar o cabeçalho. */
      if (effective.auth.type === 'oauth2') {
        try {
          const renewed = await renewTokenIfNeeded(effective.auth.oauth2, { ...environment, ...locals });
          if (renewed) {
            const auth = { ...effective.auth, oauth2: { ...effective.auth.oauth2, ...renewed } };
            effective = { ...effective, auth };
            onAuthRenewed(saved.id, auth);
            log('ok', 'OAuth2: token renovado.');
          }
        } catch (err) {
          return fail(`Falha ao obter o token OAuth2: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      /* 2. Montagem: variáveis locais (pm.variables) têm prioridade sobre as do ambiente. */
      const built = buildHttpRequest(effective, collection, { ...environment, ...locals });
      if (!built.ok) return fail(built.error);
      const { request, warnings } = built;
      warnings.forEach((warning) => log('warn', warning));
      logRequest(saved, request);

      /* 3. Envio. */
      let response;
      try {
        response = await sendHttpRequest(request);
      } catch (err) {
        return fail(`Falha na requisição: ${err instanceof Error ? err.message : String(err)}`);
      }
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

      /* 4. Pós-processamento: testes e variáveis extraídas da resposta. */
      let tests: TestResult[] = [];
      let scriptError = '';
      if (saved.postScript.trim()) {
        const output = await executeScript({
          phase: 'post',
          code: saved.postScript,
          request: scriptRequestFromSent(request),
          response: scriptResponseFrom(response),
          environment,
          variables: locals,
        });
        reportScript('pós', output);
        applyEnvironment(output.environmentChanges);
        tests = output.tests;
        tests.forEach((test) =>
          log(test.passed ? 'ok' : 'error', `Teste ${test.passed ? '✓' : '✗'} ${test.name}${test.error ? ` — ${test.error}` : ''}`)
        );
        scriptError = output.error ? `Erro no script de pós-processamento: ${output.error}` : '';
        if (scriptError) log('error', scriptError);
        patch(saved.id, { tests, scriptError });
      }

      return result({ status: response.status_code, timeSpent: response.time_spent, tests, scriptError });
    },
    [log, onComplete, onEnvironmentChanges, onAuthRenewed, patch, reportScript, logRequest]
  );

  const get = useCallback((id: string | null) => (id && runtime[id]) || IDLE, [runtime]);

  return { get, send };
}
