import { runScript } from '../lib/scripts/runScript';
import type { ScriptInput } from '../lib/scripts/types';

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
  }
}

scope.onmessage = (event) => {
  scope.postMessage(runScript(event.data));
};
