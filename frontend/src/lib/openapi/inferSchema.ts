import type { JsonSchema } from '../../types';

/**
 * Deduz um JSON Schema a partir de um exemplo. É só um ponto de partida
 * (todo campo do exemplo vira propriedade, nada é obrigatório) até o
 * scanner extrair o schema real dos DTOs.
 */
export function inferSchema(value: unknown): JsonSchema {
  if (value === null) return { nullable: true };
  if (Array.isArray(value)) {
    return value.length > 0 ? { type: 'array', items: inferSchema(value[0]) } : { type: 'array', items: {} };
  }

  switch (typeof value) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: Number.isInteger(value) ? 'integer' : 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object': {
      const properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, inferSchema(item)])
      );
      return { type: 'object', properties };
    }
    default:
      return {};
  }
}
