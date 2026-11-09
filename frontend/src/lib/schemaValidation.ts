import type { ApiDocMetadata, ApiResponseDoc, JsonSchema } from '../types';
import { inferSchema } from './openapi/inferSchema';

export interface SchemaIssue {
  path: string;
  message: string;
}

export const MAX_SCHEMA_ISSUES = 100;

const FORMATS: Record<string, RegExp> = {
  'date-time': /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:?\d{2})?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  email: /^[^\s@]+@[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asSchema(value: unknown): JsonSchema | undefined {
  return isRecord(value) ? value : undefined;
}

function schemaList(value: unknown): JsonSchema[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value: unknown, type: string): boolean {
  if (type === 'integer') return Number.isInteger(value);
  return typeOf(value) === type;
}

function isTruncatedRef(schema: JsonSchema): boolean {
  if (schema.type !== 'object') return false;
  return Object.keys(schema).length === 1 || String(schema.description ?? '').startsWith('Referência circular');
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function child(path: string, key: string | number): string {
  if (typeof key === 'number') return `${path}[${key}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
}

function validateString(value: string, schema: JsonSchema, path: string): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
    issues.push({ path, message: `deve ter ao menos ${schema.minLength} caractere(s)` });
  }
  if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
    issues.push({ path, message: `deve ter no máximo ${schema.maxLength} caractere(s)` });
  }
  if (typeof schema.pattern === 'string') {
    try {
      if (!new RegExp(schema.pattern).test(value)) issues.push({ path, message: `não casa com o padrão ${schema.pattern}` });
    } catch {
      return issues;
    }
  }
  const format = typeof schema.format === 'string' ? FORMATS[schema.format] : undefined;
  if (format && !format.test(value)) issues.push({ path, message: `formato ${String(schema.format)} inválido` });
  return issues;
}

function validateNumber(value: number, schema: JsonSchema, path: string): SchemaIssue[] {
  const { minimum, maximum, exclusiveMinimum, exclusiveMaximum } = schema;
  const issues: SchemaIssue[] = [];
  if (typeof minimum === 'number' && (exclusiveMinimum === true ? value <= minimum : value < minimum)) {
    issues.push({ path, message: `deve ser ${exclusiveMinimum === true ? 'maior que' : 'no mínimo'} ${minimum}` });
  }
  if (typeof maximum === 'number' && (exclusiveMaximum === true ? value >= maximum : value > maximum)) {
    issues.push({ path, message: `deve ser ${exclusiveMaximum === true ? 'menor que' : 'no máximo'} ${maximum}` });
  }
  if (typeof exclusiveMinimum === 'number' && value <= exclusiveMinimum) {
    issues.push({ path, message: `deve ser maior que ${exclusiveMinimum}` });
  }
  if (typeof exclusiveMaximum === 'number' && value >= exclusiveMaximum) {
    issues.push({ path, message: `deve ser menor que ${exclusiveMaximum}` });
  }
  return issues;
}

function validateArray(value: unknown[], schema: JsonSchema, path: string): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
    issues.push({ path, message: `deve ter ao menos ${schema.minItems} item(ns)` });
  }
  if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
    issues.push({ path, message: `deve ter no máximo ${schema.maxItems} item(ns)` });
  }
  const items = asSchema(schema.items);
  if (items) value.forEach((item, index) => issues.push(...validate(item, items, child(path, index))));
  return issues;
}

function validateObject(value: Record<string, unknown>, schema: JsonSchema, path: string): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const properties = asSchema(schema.properties) ?? {};

  for (const name of Array.isArray(schema.required) ? schema.required : []) {
    if (typeof name !== 'string' || name in value) continue;
    if (asSchema(properties[name])?.writeOnly === true) continue;
    issues.push({ path: child(path, name), message: 'campo obrigatório ausente' });
  }

  for (const [key, item] of Object.entries(value)) {
    const declared = asSchema(properties[key]);
    if (declared) issues.push(...validate(item, declared, child(path, key)));
    else if (schema.additionalProperties === false) issues.push({ path: child(path, key), message: 'campo não declarado' });
    else {
      const extra = asSchema(schema.additionalProperties);
      if (extra) issues.push(...validate(item, extra, child(path, key)));
    }
  }
  return issues;
}

function validateCombinators(value: unknown, schema: JsonSchema, path: string): SchemaIssue[] {
  const issues = schemaList(schema.allOf).flatMap((part) => validate(value, part, path));

  const anyOf = schemaList(schema.anyOf);
  if (anyOf.length > 0 && !anyOf.some((part) => validate(value, part, path).length === 0)) {
    issues.push({ path, message: 'não corresponde a nenhuma das opções de anyOf' });
  }

  const oneOf = schemaList(schema.oneOf);
  if (oneOf.length > 0) {
    const count = oneOf.filter((part) => validate(value, part, path).length === 0).length;
    if (count !== 1) issues.push({ path, message: `corresponde a ${count} opções de oneOf; esperada exatamente uma` });
  }
  return issues;
}

function validate(value: unknown, schema: JsonSchema, path: string): SchemaIssue[] {
  if (isTruncatedRef(schema)) return [];
  if (value === null && (schema.nullable === true || schema['x-nullable'] === true)) return [];

  const types = Array.isArray(schema.type) ? schema.type.map(String) : typeof schema.type === 'string' ? [schema.type] : [];
  if (types.length > 0 && !types.some((type) => matchesType(value, type))) {
    return [{ path, message: `esperado ${types.join(' ou ')}, veio ${typeOf(value)}` }];
  }

  const issues: SchemaIssue[] = [];
  if (Array.isArray(schema.enum) && !schema.enum.some((option) => sameValue(option, value))) {
    issues.push({ path, message: `valor fora da lista permitida: ${schema.enum.map((o) => JSON.stringify(o)).join(', ')}` });
  }
  if ('const' in schema && !sameValue(schema.const, value)) {
    issues.push({ path, message: `deve ser ${JSON.stringify(schema.const)}` });
  }

  if (typeof value === 'string') issues.push(...validateString(value, schema, path));
  else if (typeof value === 'number') issues.push(...validateNumber(value, schema, path));
  else if (Array.isArray(value)) issues.push(...validateArray(value, schema, path));
  else if (isRecord(value)) issues.push(...validateObject(value, schema, path));

  issues.push(...validateCombinators(value, schema, path));
  return issues;
}

export function validateAgainstSchema(value: unknown, schema: JsonSchema): SchemaIssue[] {
  return validate(value, schema, '$');
}

export function findResponseSchema(doc: ApiDocMetadata | undefined, status: number): ApiResponseDoc | undefined {
  const responses = (doc?.responses ?? []).filter((response) => response.schema);
  const range = `${String(status)[0]}XX`;
  return (
    responses.find((response) => response.status === String(status)) ??
    responses.find((response) => response.status.toUpperCase() === range) ??
    responses.find((response) => response.status === 'default')
  );
}

export function withInferredSchema(doc: ApiDocMetadata | undefined, status: number, value: unknown): ApiDocMetadata {
  const key = String(status);
  const responses = doc?.responses ?? [];
  const entry: ApiResponseDoc = {
    ...responses.find((response) => response.status === key),
    status: key,
    schema: inferSchema(value),
    schemaInferred: true,
  };
  const others = responses.filter((response) => response.status !== key);
  return { ...doc, responses: [...others, entry].sort((a, b) => a.status.localeCompare(b.status)) };
}
