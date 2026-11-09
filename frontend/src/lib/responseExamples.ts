import type { ApiDocMetadata, ApiResponseDoc } from '../types';
import { tryParseJson } from './json';

export const MAX_EXAMPLE_BYTES = 1024 * 1024;

export function inferContentType(body: string): string {
  if (tryParseJson(body).ok) return 'application/json';
  return /^\s*(<!doctype html|<html)/i.test(body) ? 'text/html' : 'text/plain';
}

export function findExample(doc: ApiDocMetadata | undefined, status: number): ApiResponseDoc | undefined {
  return doc?.responses?.find((response) => response.status === String(status));
}

export function withExample(doc: ApiDocMetadata | undefined, status: number, body: string): ApiDocMetadata {
  const key = String(status);
  const responses = doc?.responses ?? [];
  const entry: ApiResponseDoc = {
    ...responses.find((response) => response.status === key),
    status: key,
    contentType: inferContentType(body),
    example: body,
  };
  const others = responses.filter((response) => response.status !== key);
  return { ...doc, responses: [...others, entry].sort((a, b) => a.status.localeCompare(b.status)) };
}

export function withoutExample(doc: ApiDocMetadata | undefined, status: number): ApiDocMetadata {
  const key = String(status);
  const responses = (doc?.responses ?? []).flatMap((response) => {
    if (response.status !== key) return [response];
    const { example: _example, ...rest } = response;
    return rest.schema || rest.description ? [rest] : [];
  });
  return { ...doc, responses };
}
