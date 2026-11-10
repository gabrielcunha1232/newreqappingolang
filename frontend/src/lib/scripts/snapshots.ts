import type { Request, Response } from '../../../bindings/changeme/internal/models/models';
import type { SavedRequest } from '../../types';
import { newKeyValue } from '../factories';
import type { ScriptRequest, ScriptResponse } from './types';


export function scriptRequestFromSaved(saved: SavedRequest): ScriptRequest {
  const headers: Record<string, string> = {};
  for (const row of saved.headers) {
    if (row.enabled && row.key.trim()) headers[row.key.trim()] = row.value;
  }
  return { method: saved.method, url: saved.url, headers, body: saved.body };
}

export function applyScriptRequest(saved: SavedRequest, request: ScriptRequest): SavedRequest {
  return {
    ...saved,
    method: request.method,
    url: request.url,
    headers: Object.entries(request.headers).map(([key, value]) => newKeyValue({ key, value })),
    body: request.body,
  };
}

export function scriptRequestFromSent(request: Request): ScriptRequest {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers)) headers[key] = value ?? '';
  return { method: request.method, url: request.url, headers, body: request.body };
}

export function scriptResponseFrom(response: Response): ScriptResponse {
  return { code: response.status_code, responseTime: response.time_spent, size: response.size, body: response.body };
}

export function applyEnvironmentChanges(
  variables: Record<string, string>,
  changes: Record<string, string | null>
): Record<string, string> {
  const next = { ...variables };
  for (const [name, value] of Object.entries(changes)) {
    if (value === null) delete next[name];
    else next[name] = value;
  }
  return next;
}
