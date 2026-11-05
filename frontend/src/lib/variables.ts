import type { KeyValue } from '../types';

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

/** Substitui {{nome}} pelo valor da variável; variáveis desconhecidas ficam como estão. */
export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match
  );
}

/** Lista as variáveis referenciadas no texto que não existem no ambiente. */
export function findUnresolved(text: string, vars: Record<string, string>): string[] {
  const missing = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    if (!Object.prototype.hasOwnProperty.call(vars, match[1])) {
      missing.add(match[1]);
    }
  }
  return [...missing];
}
