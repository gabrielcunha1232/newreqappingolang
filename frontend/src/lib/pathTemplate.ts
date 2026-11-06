/*
 * Caminhos de rota escritos na sintaxe de cada framework:
 *   :id, :id?      gin, echo, fiber, express
 *   {id}, {id?}    chi, gorilla/mux, Spring, Laravel, Symfony, OpenAPI
 *   {id:[0-9]+}    chi/mux/Spring com expressão regular
 *   *path, *       curingas (gin, echo, chi, fiber)
 * {{variavel}} é variável de ambiente do app, não parâmetro de rota.
 */

export type PathToken =
  | { kind: 'text'; text: string }
  | { kind: 'param'; text: string; name: string; optional: boolean; wildcard: boolean }
  | { kind: 'variable'; text: string; name: string };

const PATTERN =
  /\{\{\s*([\w.-]+)\s*\}\}|\{([A-Za-z_][\w-]*)(\?)?(?::[^}]*)?\}|:([A-Za-z_]\w*)(\?)?|\*([A-Za-z_]\w*)?/g;

/** Nome mostrado para curingas sem nome ("/static/*"). */
export const WILDCARD_NAME = '*';

export function tokenizePath(path: string): PathToken[] {
  const tokens: PathToken[] = [];
  let last = 0;

  for (const match of path.matchAll(PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ kind: 'text', text: path.slice(last, index) });

    const [text, variable, braceName, braceOptional, colonName, colonOptional, wildcardName] = match;
    if (variable !== undefined) {
      tokens.push({ kind: 'variable', text, name: variable });
    } else if (braceName !== undefined || colonName !== undefined) {
      tokens.push({
        kind: 'param',
        text,
        name: braceName ?? colonName,
        optional: Boolean(braceOptional ?? colonOptional),
        wildcard: false,
      });
    } else {
      tokens.push({ kind: 'param', text, name: wildcardName ?? WILDCARD_NAME, optional: true, wildcard: true });
    }
    last = index + text.length;
  }

  if (last < path.length) tokens.push({ kind: 'text', text: path.slice(last) });
  return tokens;
}

export interface PathParamInfo {
  name: string;
  optional: boolean;
  wildcard: boolean;
}

export function extractPathParams(path: string): PathParamInfo[] {
  const seen = new Set<string>();
  const params: PathParamInfo[] = [];
  for (const token of tokenizePath(path)) {
    if (token.kind !== 'param' || seen.has(token.name)) continue;
    seen.add(token.name);
    params.push({ name: token.name, optional: token.optional, wildcard: token.wildcard });
  }
  return params;
}

/**
 * Remove query e hash. O "?" de parâmetro opcional (":id?" no fim de um
 * segmento, "{id?}") faz parte do caminho, não inicia a query.
 */
function stripQuery(url: string): string {
  let depth = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url[i];
    if (char === '{') depth++;
    else if (char === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0 && char === '#') return url.slice(0, i);
    else if (depth === 0 && char === '?') {
      const optionalMarker = /:[A-Za-z_]\w*$/.test(url.slice(0, i)) && /^(\/|$)/.test(url.slice(i + 1));
      if (!optionalMarker) return url.slice(0, i);
    }
  }
  return url;
}

/** Separa a base ("http://host:8080", "{{baseUrl}}") do caminho, sem query nem hash. */
export function splitBaseAndPath(url: string): { base: string; path: string } {
  const clean = stripQuery(url.trim());

  const absolute = /^([a-z][a-z\d+.-]*:\/\/[^/]+)(.*)$/i.exec(clean);
  if (absolute) return { base: absolute[1], path: absolute[2] || '/' };

  const variable = /^(\{\{\s*[\w.-]+\s*\}\})(.*)$/.exec(clean);
  if (variable) return { base: variable[1], path: variable[2] || '/' };

  return { base: '', path: clean || '/' };
}

const IGNORED_SEGMENT = /^(api|rest|v\d+(\.\d+)*)$/i;

/**
 * Agrupamento padrão (equivalente às tags do Swagger): primeiro segmento
 * significativo do caminho, ignorando prefixos como /api e /v1.
 * "/api/v1/users/:id" → "users".
 */
export function tagFromPath(path: string, fallback = 'geral'): string {
  for (const token of tokenizePath(path)) {
    if (token.kind !== 'text') continue;
    const segment = token.text.split('/').find((part) => part && !IGNORED_SEGMENT.test(part));
    if (segment) return segment;
  }
  return fallback;
}
