import type { JsonSchema } from '../../types';
import { isObject } from './parseSpec';

/** Palavras-chave cujo valor é um schema (ou lista/mapa de schemas). */
const NESTED_SCHEMA = new Set(['items', 'not', 'additionalProperties']);
const SCHEMA_LIST = new Set(['allOf', 'oneOf', 'anyOf']);
const SCHEMA_MAP = new Set(['properties']);

/**
 * Converte construções do OpenAPI 3.1 (JSON Schema 2020-12) para o
 * equivalente do 3.0, que é a versão exportada:
 *   type: [string, "null"]   → type: string + nullable: true
 *   examples: [a, b]         → example: a
 *   const: x                 → enum: [x]
 *   exclusiveMinimum: 5      → minimum: 5 + exclusiveMinimum: true
 */
export function toOas30Schema(schema: JsonSchema): JsonSchema {
  const result: JsonSchema = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type' && Array.isArray(value)) {
      const types = value.filter((t) => t !== 'null');
      if (types.length > 0) result.type = types[0];
      if (types.length < value.length) result.nullable = true;
    } else if (key === 'examples' && Array.isArray(value)) {
      if (value.length > 0 && schema.example === undefined) result.example = value[0];
    } else if (key === 'const') {
      result.enum = [value];
    } else if ((key === 'exclusiveMinimum' || key === 'exclusiveMaximum') && typeof value === 'number') {
      result[key === 'exclusiveMinimum' ? 'minimum' : 'maximum'] = value;
      result[key] = true;
    } else if (NESTED_SCHEMA.has(key) && isObject(value)) {
      result[key] = toOas30Schema(value);
    } else if (SCHEMA_LIST.has(key) && Array.isArray(value)) {
      result[key] = value.map((item) => (isObject(item) ? toOas30Schema(item) : item));
    } else if (SCHEMA_MAP.has(key) && isObject(value)) {
      result[key] = Object.fromEntries(
        Object.entries(value).map(([name, item]) => [name, isObject(item) ? toOas30Schema(item) : item])
      );
    } else if (key !== '$schema' && key !== '$id') {
      result[key] = value;
    }
  }
  return result;
}
