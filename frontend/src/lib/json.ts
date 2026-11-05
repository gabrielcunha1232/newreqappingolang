export type JsonTokenKind = 'key' | 'str' | 'num' | 'bool' | 'plain';

export interface JsonToken {
  kind: JsonTokenKind;
  text: string;
}

const TOKEN_PATTERN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

/** Divide uma linha de JSON formatado em tokens para realce de sintaxe. */
export function tokenizeJsonLine(line: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let last = 0;

  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ kind: 'plain', text: line.slice(last, index) });

    if (match[1] !== undefined) {
      if (match[2] !== undefined) {
        tokens.push({ kind: 'key', text: match[1] });
        tokens.push({ kind: 'plain', text: match[2] });
      } else {
        tokens.push({ kind: 'str', text: match[1] });
      }
    } else if (match[3] !== undefined) {
      tokens.push({ kind: 'bool', text: match[0] });
    } else {
      tokens.push({ kind: 'num', text: match[0] });
    }
    last = index + match[0].length;
  }

  if (last < line.length) tokens.push({ kind: 'plain', text: line.slice(last) });
  return tokens;
}

export function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Encontra uma lista de objetos para exibir como tabela: a raiz, ou o primeiro
 * campo de primeiro nível que seja uma lista de objetos (ex.: { data: [...] }).
 */
export function findTabularData(value: unknown): Record<string, unknown>[] | null {
  const isTable = (v: unknown): v is Record<string, unknown>[] =>
    Array.isArray(v) && v.length > 0 && v.every(isPlainObject);

  if (isTable(value)) return value;
  if (isPlainObject(value)) {
    for (const field of Object.values(value)) {
      if (isTable(field)) return field;
    }
    return [value];
  }
  return null;
}

export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
