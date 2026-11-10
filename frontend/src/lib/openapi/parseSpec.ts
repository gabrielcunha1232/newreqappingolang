import { CORE_SCHEMA, load } from 'js-yaml';

export type SpecObject = Record<string, unknown>;

export function isObject(value: unknown): value is SpecObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSpecText(text: string): SpecObject {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('A especificação está vazia.');

  let parsed: unknown;
  try {
    parsed = trimmed.startsWith('{') ? JSON.parse(trimmed) : load(trimmed, { schema: CORE_SCHEMA, json: true });
  } catch (err) {
    const reason = err instanceof Error ? err.message.split('\n')[0] : String(err);
    throw new Error(`Não foi possível ler o arquivo como JSON ou YAML: ${reason}`);
  }

  if (!isObject(parsed) || !(isObject(parsed.paths) || typeof parsed.openapi === 'string' || parsed.swagger)) {
    throw new Error('O conteúdo não parece uma especificação OpenAPI/Swagger (faltam "openapi"/"swagger" e "paths").');
  }
  return parsed;
}
