import type { LogEntry } from '../types';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatClock(date = new Date()): string {
  return date.toLocaleTimeString('pt-BR');
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'CREATED',
  202: 'ACCEPTED',
  204: 'NO CONTENT',
  301: 'MOVED PERMANENTLY',
  302: 'FOUND',
  304: 'NOT MODIFIED',
  400: 'BAD REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT FOUND',
  405: 'METHOD NOT ALLOWED',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE ENTITY',
  429: 'TOO MANY REQUESTS',
  500: 'INTERNAL SERVER ERROR',
  502: 'BAD GATEWAY',
  503: 'SERVICE UNAVAILABLE',
  504: 'GATEWAY TIMEOUT',
};

export function statusLabel(code: number): string {
  return `${code} ${STATUS_TEXT[code] ?? ''}`.trim();
}

export function statusClass(code: number): string {
  if (code >= 200 && code < 300) return 'status-ok';
  if (code >= 300 && code < 400) return 'status-redirect';
  return 'status-fail';
}

export function methodClass(method: string): string {
  const m = method.toUpperCase();
  if (m === 'DELETE') return 'method del';
  if (m === 'GET') return 'method';
  return `method ${m.toLowerCase()}`;
}

export function methodShort(method: string): string {
  const m = method.toUpperCase();
  if (m === 'DELETE') return 'DEL';
  if (m === 'OPTIONS') return 'OPT';
  return m;
}

export function logsToText(entries: LogEntry[]): string {
  return entries.map((e) => `[${e.time}] ${e.level.toUpperCase()} ${e.message}`).join('\n');
}
