import { isObject } from './parseSpec';

const MAX_DEPTH = 8;

const STRING_BY_FORMAT: Record<string, string> = {
  'date-time': '2024-01-01T12:00:00Z',
  date: '2024-01-01',
  time: '12:00:00',
  email: 'usuario@exemplo.com',
  uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  uri: 'https://exemplo.com',
  url: 'https://exemplo.com',
  hostname: 'exemplo.com',
  ipv4: '127.0.0.1',
  password: '',
  byte: '',
  binary: '',
};

export function schemaType(schema: Record<string, unknown>): string | undefined {
  const { type } = schema;
  if (Array.isArray(type)) return type.find((t): t is string => typeof t === 'string' && t !== 'null');
  if (typeof type === 'string') return type;
  if (isObject(schema.properties)) return 'object';
  if (schema.items !== undefined) return 'array';
  return undefined;
}

export function exampleFromSchema(schema: unknown, usage: 'request' | 'response', depth = 0): unknown {
  if (!isObject(schema) || depth > MAX_DEPTH) return undefined;

  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.examples) && schema.examples.length > 0) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

  if (Array.isArray(schema.allOf)) {
    const parts = schema.allOf.map((part) => exampleFromSchema(part, usage, depth + 1));
    return parts.every((part) => isObject(part) || part === undefined)
      ? Object.assign({}, ...parts.filter(isObject))
      : parts.find((part) => part !== undefined);
  }
  for (const key of ['oneOf', 'anyOf'] as const) {
    const options = schema[key];
    if (Array.isArray(options) && options.length > 0) return exampleFromSchema(options[0], usage, depth + 1);
  }

  switch (schemaType(schema)) {
    case 'object': {
      const hiddenFlag = usage === 'request' ? 'readOnly' : 'writeOnly';
      const properties = isObject(schema.properties) ? schema.properties : {};
      return Object.fromEntries(
        Object.entries(properties)
          .filter(([, property]) => !(isObject(property) && property[hiddenFlag] === true))
          .map(([key, property]) => [key, exampleFromSchema(property, usage, depth + 1) ?? null])
      );
    }
    case 'array': {
      const item = exampleFromSchema(schema.items, usage, depth + 1);
      return item === undefined ? [] : [item];
    }
    case 'string':
      return typeof schema.format === 'string' ? STRING_BY_FORMAT[schema.format] ?? 'texto' : 'texto';
    case 'integer':
    case 'number':
      return typeof schema.minimum === 'number' ? schema.minimum : 0;
    case 'boolean':
      return true;
    default:
      return undefined;
  }
}
