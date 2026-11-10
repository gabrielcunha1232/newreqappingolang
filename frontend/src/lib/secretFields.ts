import type { Collection, Environment, Folder, HistoryEntry, KeyValue, RequestAuth, SavedRequest, StoredResponse } from '../types';
import { isSensitiveName, secretEntries } from './secrets';

export type SecretMap = Record<string, string>;

export interface SecretHolder {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  environments: Environment[];
}

export interface StoredBodies {
  history: HistoryEntry[];
  responses: Record<string, StoredResponse>;
}

export interface SecuritySettings {
  persistAccessTokens: boolean;
  maskStoredResponses: boolean;
}

export const DEFAULT_SECURITY: SecuritySettings = {
  persistAccessTokens: false,
  maskStoredResponses: true,
};

export function sanitizeSecurity(value: unknown): SecuritySettings {
  const raw = value && typeof value === 'object' ? (value as Partial<SecuritySettings>) : {};
  return {
    persistAccessTokens:
      typeof raw.persistAccessTokens === 'boolean' ? raw.persistAccessTokens : DEFAULT_SECURITY.persistAccessTokens,
    maskStoredResponses:
      typeof raw.maskStoredResponses === 'boolean' ? raw.maskStoredResponses : DEFAULT_SECURITY.maskStoredResponses,
  };
}

const AUTH_FIELDS = ['token', 'password', 'apiKeyValue'] as const;
const OAUTH_FIELDS = ['clientSecret', 'accessToken', 'refreshToken'] as const;
const MASK = '***';
const MIN_MASK_LENGTH = 4;

function isLiteral(value: string): boolean {
  return value.trim() !== '' && !value.includes('{{');
}

type Visitor = {
  auth: (prefix: string, auth: RequestAuth) => RequestAuth;
  rows: (prefix: string, rows: KeyValue[], pick: (row: KeyValue) => boolean) => KeyValue[];
};

function walk<T extends SecretHolder>(state: T, visit: Visitor): T {
  const auth = <A extends { id: string; auth?: RequestAuth }>(kind: string, item: A): A =>
    item.auth ? { ...item, auth: visit.auth(`${kind}:${item.id}:auth`, item.auth) } : item;
  const sensitive = (row: KeyValue) => isSensitiveName(row.key);

  return {
    ...state,
    collections: state.collections.map((c) => auth('c', c)),
    folders: state.folders.map((f) => auth('f', f)),
    requests: state.requests.map((r) => {
      const withAuth = auth('r', r);
      return {
        ...withAuth,
        headers: visit.rows(`r:${r.id}:h`, r.headers, sensitive),
        params: visit.rows(`r:${r.id}:p`, r.params, sensitive),
        ...(r.formFields && { formFields: visit.rows(`r:${r.id}:ff`, r.formFields, sensitive) }),
      };
    }),
    environments: state.environments.map((e) => ({
      ...e,
      variables: visit.rows(`e:${e.id}`, e.variables, (row) => Boolean(row.secret)),
    })),
  };
}

function decodeKey(key: string): string {
  try {
    return decodeURIComponent(key.replace(/\+/g, ' '));
  } catch {
    return key;
  }
}

export function stripUrlSecrets(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return url;
  const hashStart = url.indexOf('#', queryStart);
  const end = hashStart === -1 ? url.length : hashStart;
  const query = url
    .slice(queryStart + 1, end)
    .split('&')
    .map((pair) => {
      const eq = pair.indexOf('=');
      if (eq === -1) return pair;
      const key = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      return isSensitiveName(decodeKey(key)) && isLiteral(value) ? `${key}=` : pair;
    })
    .join('&');
  return url.slice(0, queryStart + 1) + query + url.slice(end);
}

export function extractSecrets<T extends SecretHolder>(state: T): { state: T; secrets: SecretMap } {
  const secrets: SecretMap = {};
  const take = (key: string, value: string): string => {
    if (!isLiteral(value)) return value;
    secrets[key] = value;
    return '';
  };

  const stripped = walk(state, {
    auth: (prefix, auth) => {
      const next: RequestAuth = { ...auth, oauth2: { ...auth.oauth2 } };
      for (const field of AUTH_FIELDS) next[field] = take(`${prefix}:${field}`, auth[field] ?? '');
      for (const field of OAUTH_FIELDS) next.oauth2[field] = take(`${prefix}:${field}`, auth.oauth2?.[field] ?? '');
      return next;
    },
    rows: (prefix, rows, pick) =>
      rows.map((row) => (pick(row) ? { ...row, value: take(`${prefix}:${row.id}`, row.value) } : row)),
  });
  const requests = stripped.requests.map((request) => {
    const url = stripUrlSecrets(request.url);
    if (url === request.url) return request;
    secrets[`r:${request.id}:url`] = request.url;
    return { ...request, url };
  });
  return { state: { ...stripped, requests }, secrets };
}

export function injectSecrets<T extends SecretHolder>(state: T, secrets: SecretMap): T {
  const give = (key: string, value: string): string => (key in secrets && value === '' ? secrets[key] : value);

  const injected = walk(state, {
    auth: (prefix, auth) => {
      const next: RequestAuth = { ...auth, oauth2: { ...auth.oauth2 } };
      for (const field of AUTH_FIELDS) next[field] = give(`${prefix}:${field}`, auth[field] ?? '');
      for (const field of OAUTH_FIELDS) next.oauth2[field] = give(`${prefix}:${field}`, auth.oauth2?.[field] ?? '');
      return next;
    },
    rows: (prefix, rows) => rows.map((row) => ({ ...row, value: give(`${prefix}:${row.id}`, row.value) })),
  });
  return {
    ...injected,
    requests: injected.requests.map((request) => {
      const original = secrets[`r:${request.id}:url`];
      return original !== undefined && stripUrlSecrets(original) === request.url ? { ...request, url: original } : request;
    }),
  };
}

export function hasSecrets(state: SecretHolder): boolean {
  return Object.keys(extractSecrets(state).secrets).length > 0;
}

export function stripAccessTokens<T extends SecretHolder>(state: T): T {
  return walk(state, {
    auth: (_, auth) =>
      auth.oauth2?.accessToken ? { ...auth, oauth2: { ...auth.oauth2, accessToken: '', expiresAt: null } } : auth,
    rows: (_, rows) => rows,
  });
}

interface MaskEntry {
  value: string;
  replacement: string;
}

function maskEntries(state: SecretHolder): MaskEntry[] {
  const named = state.environments.flatMap((env) => secretEntries(env.variables));
  const byValue = new Map<string, string>();
  for (const { name, value } of named) byValue.set(value, `{{${name}}}`);
  for (const value of Object.values(extractSecrets(state).secrets)) {
    if (!byValue.has(value)) byValue.set(value, MASK);
  }
  return [...byValue.entries()]
    .filter(([value]) => value.length >= MIN_MASK_LENGTH)
    .map(([value, replacement]) => ({ value, replacement }))
    .sort((a, b) => b.value.length - a.value.length);
}

export function maskText(text: string, entries: MaskEntry[]): string {
  let result = text;
  for (const { value, replacement } of entries) {
    const encoded = encodeURIComponent(value);
    for (const form of new Set([value, encoded, encoded.replace(/%20/g, '+')])) {
      if (result.includes(form)) result = result.split(form).join(replacement);
    }
  }
  return result;
}

export function maskStoredBodies<T extends SecretHolder & StoredBodies>(state: T): T {
  const entries = maskEntries(state);
  if (entries.length === 0) return state;
  return {
    ...state,
    history: state.history.map((entry) => ({
      ...entry,
      url: maskText(entry.url, entries),
      body: entry.body === undefined ? undefined : maskText(entry.body, entries),
    })),
    responses: Object.fromEntries(
      Object.entries(state.responses).map(([id, response]) => [id, { ...response, body: maskText(response.body, entries) }])
    ),
  };
}
