import type { ScriptInput, ScriptOutput } from '../lib/scripts/types';

/** Tempo máximo de um script (protege contra loops infinitos). */
export const SCRIPT_TIMEOUT_MS = 5000;

function failed(input: ScriptInput, error: string): ScriptOutput {
  return { error, request: input.request, environmentChanges: {}, variables: input.variables, tests: [], logs: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** O worker roda código do usuário: confere a forma da resposta antes de usar. */
function validOutput(data: unknown, input: ScriptInput): ScriptOutput {
  if (!isRecord(data) || !isRecord(data.request) || !Array.isArray(data.tests)) {
    return failed(input, 'O script devolveu um resultado inválido.');
  }
  return data as unknown as ScriptOutput;
}

/** Executa um script num Web Worker isolado, criado só para esta execução. */
export function executeScript(input: ScriptInput, timeoutMs = SCRIPT_TIMEOUT_MS): Promise<ScriptOutput> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('../workers/scriptWorker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      resolve(failed(input, `Não foi possível iniciar o sandbox de scripts: ${err instanceof Error ? err.message : String(err)}`));
      return;
    }

    const finish = (output: ScriptOutput) => {
      window.clearTimeout(timer);
      worker.terminate();
      resolve(output);
    };

    const timer = window.setTimeout(
      () => finish(failed(input, `Tempo limite de ${timeoutMs / 1000} s excedido (loop infinito?).`)),
      timeoutMs
    );

    worker.onmessage = (event: MessageEvent<unknown>) => finish(validOutput(event.data, input));
    worker.onerror = (event) => {
      event.preventDefault();
      finish(failed(input, event.message || 'Falha ao executar o script.'));
    };
    worker.postMessage(input);
  });
}
