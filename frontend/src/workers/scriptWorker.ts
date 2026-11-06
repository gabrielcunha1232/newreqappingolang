import { runScript } from '../lib/scripts/runScript';
import type { ScriptInput } from '../lib/scripts/types';

/*
 * Sandbox dos scripts pre/post. Um worker novo é criado a cada execução e
 * encerrado em seguida (sem estado entre execuções). Worker não tem DOM nem
 * acesso às funções do Go; aqui também tiramos rede e carregamento de código,
 * para um script (inclusive de coleção importada) não enviar dados para fora.
 */
const BLOCKED = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'WebTransport',
  'EventSource',
  'importScripts',
  'indexedDB',
  'caches',
  'BroadcastChannel',
  'Worker',
  'SharedWorker',
];

const scope = self as unknown as Record<string, unknown> & {
  postMessage: (message: unknown) => void;
  onmessage: ((event: MessageEvent<ScriptInput>) => void) | null;
};

for (const name of BLOCKED) {
  try {
    Object.defineProperty(scope, name, { value: undefined, writable: false, configurable: false });
  } catch {
    // Propriedade não redefinível neste navegador: segue sem ela.
  }
}

scope.onmessage = (event) => {
  scope.postMessage(runScript(event.data));
};
