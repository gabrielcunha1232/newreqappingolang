import type { KeyValue } from '../types';
import { newKeyValue } from './factories';

const VARIABLE_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function variablesToMap(variables: KeyValue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const variable of variables) {
    if (variable.enabled && variable.key.trim()) {
      map[variable.key.trim()] = variable.value;
    }
  }
  return map;
}

export function mergeVariableChanges(rows: KeyValue[], changes: Record<string, string | null>): KeyValue[] {
  let next = [...rows];
  for (const [name, value] of Object.entries(changes)) {
    if (value === null) {
      next = next.filter((row) => row.key.trim() !== name);
      continue;
    }
    const index = next.findIndex((row) => row.key.trim() === name);
    if (index === -1) next.push(newKeyValue({ key: name, value }));
    else next[index] = { ...next[index], value, enabled: true };
  }
  return next;
}

export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match
  );
}

export function findUnresolved(text: string, vars: Record<string, string>): string[] {
  const missing = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    if (!Object.prototype.hasOwnProperty.call(vars, match[1])) {
      missing.add(match[1]);
    }
  }
  return [...missing];
}
