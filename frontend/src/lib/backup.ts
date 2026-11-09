import type { PersistedState } from '../types';

const FORMAT = 'forkarsenet-backup';
const VERSION = 1;

export interface ParsedBackup {
  exportedAt: string;
  state: Partial<PersistedState>;
}

export function serializeBackup(state: PersistedState, now = new Date()): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: now.toISOString(), state }, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasIds(list: unknown): boolean {
  return list === undefined || (Array.isArray(list) && list.every((item) => isRecord(item) && typeof item.id === 'string'));
}

export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (!isRecord(data) || data.format !== FORMAT) throw new Error('Este arquivo não é um backup do Forkarsenet.');
  if (typeof data.version !== 'number' || data.version > VERSION) {
    throw new Error('Este backup foi criado por uma versão mais nova do app.');
  }
  const { state } = data;
  if (
    !isRecord(state) ||
    !Array.isArray(state.requests) ||
    !Array.isArray(state.collections) ||
    ![state.requests, state.collections, state.folders, state.environments, state.history].every(hasIds)
  ) {
    throw new Error('O backup está incompleto ou corrompido.');
  }
  return { exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '', state: state as Partial<PersistedState> };
}
