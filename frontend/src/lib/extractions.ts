import type { ResponseExtraction } from '../types';
import { tryParseJson } from './json';

export interface JsonLeaf {
  path: string;
  value: string;
  variable: string;
}

const TOKEN = /\.?([A-Za-z_$][\w$]*)|\[(\d+)\]|\[("(?:[^"\\]|\\.)*")\]/y;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function childPath(path: string, key: string | number): string {
  if (typeof key === 'number') return `${path}[${key}]`;
  if (!IDENTIFIER.test(key)) return `${path}[${JSON.stringify(key)}]`;
  return path ? `${path}.${key}` : key;
}

function variableName(key: string): string {
  return key.replace(/[^\w.-]/g, '_');
}

function asText(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function flattenJson(root: unknown, limit = 400): JsonLeaf[] {
  const leaves: JsonLeaf[] = [];
  const walk = (value: unknown, path: string, name: string) => {
    if (leaves.length >= limit) return;
    if (Array.isArray(value)) value.forEach((item, index) => walk(item, childPath(path, index), name));
    else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, item]) => walk(item, childPath(path, key), key));
    } else if (path) leaves.push({ path, value: asText(value), variable: variableName(name) });
  };
  walk(root, '', '');
  return leaves;
}

function parsePath(path: string): Array<string | number> | null {
  const keys: Array<string | number> = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < path.length) {
    const match = TOKEN.exec(path);
    if (!match) return null;
    if (match[1] !== undefined) keys.push(match[1]);
    else if (match[2] !== undefined) keys.push(Number(match[2]));
    else keys.push(JSON.parse(match[3]) as string);
  }
  return keys;
}

export function readPath(root: unknown, path: string): unknown {
  const keys = parsePath(path);
  if (!keys) return undefined;
  let current: unknown = root;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

export function applyExtractions(rules: ResponseExtraction[], body: string): { changes: Record<string, string>; missing: string[] } {
  const parsed = tryParseJson(body);
  if (!parsed.ok) return { changes: {}, missing: rules.map((rule) => rule.path) };

  const changes: Record<string, string> = {};
  const missing: string[] = [];
  for (const rule of rules) {
    const value = readPath(parsed.value, rule.path);
    if (value === undefined || value === null) missing.push(rule.path);
    else changes[rule.variable] = asText(value);
  }
  return { changes, missing };
}
