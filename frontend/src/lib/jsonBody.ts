
const VARIABLE_AT = /\{\{\s*[\w.-]+\s*\}\}/y;

interface VariableSpan {
  from: number;
  to: number;
  bare: boolean;
}

function findVariables(text: string): VariableSpan[] {
  const spans: VariableSpan[] = [];
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString && ch === '\\') {
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (ch === '{' && text[i + 1] === '{') {
      VARIABLE_AT.lastIndex = i;
      const match = VARIABLE_AT.exec(text);
      if (match) {
        spans.push({ from: i, to: i + match[0].length, bare: !inString });
        i += match[0].length - 1;
      }
    }
  }
  return spans;
}

function toParsable(text: string): string {
  let out = '';
  let last = 0;
  for (const span of findVariables(text)) {
    if (!span.bare) continue;
    out += text.slice(last, span.from) + '0'.padEnd(span.to - span.from, ' ');
    last = span.to;
  }
  return out + text.slice(last);
}

export interface JsonBodyError {
  message: string;
  line: number;
  column: number;
  position: number;
}

class JsonSyntaxError extends Error {
  constructor(
    message: string,
    readonly position: number
  ) {
    super(message);
  }
}

const NUMBER_AT = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const ESCAPES = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't']);
const WHITESPACE = new Set([' ', '\t', '\n', '\r']);

function validateJson(text: string): void {
  let i = 0;
  const fail = (message: string, at = i): never => {
    throw new JsonSyntaxError(message, at);
  };
  const skipWs = () => {
    while (i < text.length && WHITESPACE.has(text[i])) i++;
  };
  const expectMore = () => {
    if (i >= text.length) fail('JSON incompleto: falta fechar algo', text.length);
  };

  const parseString = () => {
    const start = i++;
    while (i < text.length) {
      const ch = text[i];
      if (ch === '"') {
        i++;
        return;
      }
      if (ch === '\\') {
        const next = text[i + 1];
        if (next === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) fail('Escape \\u inválido dentro do texto');
          i += 6;
        } else if (next !== undefined && ESCAPES.has(next)) {
          i += 2;
        } else {
          fail('Escape inválido dentro do texto');
        }
        continue;
      }
      if (ch.charCodeAt(0) < 0x20) fail('Quebra de linha ou caractere inválido dentro do texto (use \\n)');
      i++;
    }
    fail('Texto sem aspas de fechamento', start);
  };

  const parseValue = (): void => {
    skipWs();
    expectMore();
    const ch = text[i];
    if (ch === '{') return parseContainer('}');
    if (ch === '[') return parseContainer(']');
    if (ch === '"') return parseString();
    if (ch === "'") fail('Use aspas duplas (") em vez de aspas simples');
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      NUMBER_AT.lastIndex = i;
      const match = NUMBER_AT.exec(text);
      if (!match) return fail('Número inválido');
      i += match[0].length;
      return;
    }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, i)) {
        i += literal.length;
        return;
      }
    }
    if (/[A-Za-z_]/.test(ch)) fail('Valor inválido: textos precisam estar entre aspas duplas');
    fail(`Caractere inesperado '${ch}'`);
  };

  const parseContainer = (close: '}' | ']') => {
    const isObject = close === '}';
    i++;
    skipWs();
    expectMore();
    if (text[i] === close) {
      i++;
      return;
    }
    for (;;) {
      if (isObject) {
        skipWs();
        expectMore();
        if (text[i] === "'") fail('Use aspas duplas (") no nome da propriedade');
        if (text[i] !== '"') fail('Esperado nome de propriedade entre aspas duplas');
        parseString();
        skipWs();
        expectMore();
        if (text[i] !== ':') fail("Esperado ':' depois do nome da propriedade");
        i++;
      }
      parseValue();
      skipWs();
      expectMore();
      if (text[i] === close) {
        i++;
        return;
      }
      if (text[i] !== ',') {
        fail(isObject ? "Esperado ',' ou '}' depois do valor" : "Esperado ',' ou ']' depois do item da lista");
      }
      const comma = i++;
      skipWs();
      if (text[i] === close) fail(`Vírgula sobrando antes de '${close}'`, comma);
    }
  };

  parseValue();
  skipWs();
  if (i < text.length) fail('Há conteúdo depois do fim do JSON');
}

function lineAndColumn(text: string, position: number) {
  const before = text.slice(0, position);
  const line = before.split('\n').length;
  const column = position - before.lastIndexOf('\n');
  return { line, column };
}

export function findJsonError(text: string): JsonBodyError | null {
  if (!text.trim()) return null;
  try {
    validateJson(toParsable(text));
    return null;
  } catch (err) {
    if (!(err instanceof JsonSyntaxError)) throw err;
    return { message: err.message, position: err.position, ...lineAndColumn(text, err.position) };
  }
}

export function formatJsonBody(text: string, indent: number): string | null {
  if (!text.trim()) return text;

  const spans = findVariables(text);
  const originals: string[] = [];
  let masked = '';
  let last = 0;
  spans.forEach((span, i) => {
    const marker = `__FKV_${i}__`;
    originals.push(text.slice(span.from, span.to));
    masked += text.slice(last, span.from) + (span.bare ? `"${marker}"` : marker);
    last = span.to;
  });
  masked += text.slice(last);

  let formatted: string;
  try {
    formatted = JSON.stringify(JSON.parse(masked), null, indent || undefined);
  } catch {
    return null;
  }

  spans.forEach((span, i) => {
    const marker = `__FKV_${i}__`;
    formatted = formatted.replace(span.bare ? `"${marker}"` : marker, () => originals[i]);
  });
  return formatted;
}
