import type { JsonSchema } from '../types';

export interface SchemaField {
  parent: string[];
  name: string;
  path: string;
  type: string;
  depth: number;
  required: boolean;
}

function isRecord(value: unknown): value is JsonSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function typeLabel(schema: JsonSchema): string {
  return Array.isArray(schema.type) ? schema.type.join(' | ') : typeof schema.type === 'string' ? schema.type : 'qualquer';
}

export function schemaFields(root: JsonSchema): SchemaField[] {
  const fields: SchemaField[] = [];
  const walk = (schema: JsonSchema, pointer: string[], path: string, depth: number) => {
    const required = Array.isArray(schema.required) ? schema.required : [];
    if (isRecord(schema.properties)) {
      for (const [name, property] of Object.entries(schema.properties)) {
        if (!isRecord(property)) continue;
        const full = path ? `${path}.${name}` : name;
        fields.push({ parent: pointer, name, path: full, type: typeLabel(property), depth, required: required.includes(name) });
        walk(property, [...pointer, 'properties', name], full, depth + 1);
      }
    }
    if (isRecord(schema.items)) walk(schema.items, [...pointer, 'items'], `${path}[]`, depth);
  };
  walk(root, [], '', 0);
  return fields;
}

function withRequired(schema: JsonSchema, name: string, on: boolean): JsonSchema {
  const current = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const required = on ? [...new Set([...current, name])] : current.filter((item) => item !== name);
  const { required: _required, ...rest } = schema;
  return required.length > 0 ? { ...rest, required } : rest;
}

export function setRequired(schema: JsonSchema, parent: string[], name: string, on: boolean): JsonSchema {
  if (parent.length === 0) return withRequired(schema, name, on);
  const [key, ...rest] = parent;
  const child = schema[key];
  return isRecord(child) ? { ...schema, [key]: setRequired(child, rest, name, on) } : schema;
}

export function setAllRequired(schema: JsonSchema, on: boolean): JsonSchema {
  return schemaFields(schema).reduce((current, field) => setRequired(current, field.parent, field.name, on), schema);
}
