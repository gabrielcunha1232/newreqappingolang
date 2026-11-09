import type { Collection, Folder, KeyValue, RequestAuth, SavedRequest } from '../../types';
import { generateId } from '../id';
import { tryParseJson } from '../json';
import { extractPathParams, splitBaseAndPath, tokenizePath, WILDCARD_NAME } from '../pathTemplate';
import { isSensitiveName } from '../secrets';
import { folderChain, treeChildren } from '../tree';
import { normalizeBaseUrl } from '../url';

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

type Json = Record<string, unknown>;

interface Context {
  collection: Collection;
  folders: Folder[];
  requests: SavedRequest[];
  warnings: string[];
  secret: (value: string) => string;
}

export interface PostmanExportResult {
  document: Json;
  warnings: string[];
}

function pairs(values: Record<string, string>): Json[] {
  return Object.entries(values).map(([key, value]) => ({ key, value, type: 'string' }));
}

function convertAuth(auth: RequestAuth | undefined, ctx: Context): Json | undefined {
  switch (auth?.type) {
    case 'none':
      return { type: 'noauth' };
    case 'bearer':
      return { type: 'bearer', bearer: pairs({ token: ctx.secret(auth.token) }) };
    case 'basic':
      return { type: 'basic', basic: pairs({ username: auth.username, password: ctx.secret(auth.password) }) };
    case 'apikey':
      return { type: 'apikey', apikey: pairs({ key: auth.apiKeyName, value: ctx.secret(auth.apiKeyValue), in: 'header' }) };
    case 'oauth2':
      return {
        type: 'oauth2',
        oauth2: pairs({
          grant_type: auth.oauth2.grant === 'authorization_code' ? 'authorization_code_with_pkce' : 'client_credentials',
          accessTokenUrl: auth.oauth2.tokenUrl,
          authUrl: auth.oauth2.authUrl,
          redirect_uri: auth.oauth2.redirectUri,
          clientId: auth.oauth2.clientId,
          clientSecret: ctx.secret(auth.oauth2.clientSecret),
          scope: auth.oauth2.scope,
        }),
      };
    default:
      return undefined;
  }
}

function convertRows(rows: KeyValue[] | undefined, ctx: Context): Json[] {
  return (rows ?? [])
    .filter((row) => row.key.trim())
    .map((row) => ({
      key: row.key,
      value: isSensitiveName(row.key) ? ctx.secret(row.value) : row.value,
      ...(row.enabled ? {} : { disabled: true }),
      ...(row.description ? { description: row.description } : {}),
    }));
}

function redactJson(value: unknown, ctx: Context): unknown {
  if (Array.isArray(value)) return value.map((item) => redactJson(item, ctx));
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Json).map(([key, item]) => [
      key,
      isSensitiveName(key) && typeof item === 'string' ? ctx.secret(item) : redactJson(item, ctx),
    ])
  );
}

function redactJsonText(text: string, ctx: Context): string {
  const parsed = tryParseJson(text);
  if (!parsed.ok) return text;
  const redacted = redactJson(parsed.value, ctx);
  return JSON.stringify(redacted) === JSON.stringify(parsed.value) ? text : JSON.stringify(redacted, null, 2);
}

function convertBody(request: SavedRequest, ctx: Context): Json | undefined {
  switch (request.bodyType) {
    case 'form': {
      const urlencoded = convertRows(request.formFields, ctx).map((row) => ({ ...row, type: 'text' }));
      return urlencoded.length > 0 ? { mode: 'urlencoded', urlencoded } : undefined;
    }
    case 'graphql':
      return request.body.trim()
        ? { mode: 'graphql', graphql: { query: request.body, variables: redactJsonText(request.graphqlVariables ?? '', ctx) } }
        : undefined;
    case 'json':
      return request.body.trim()
        ? { mode: 'raw', raw: redactJsonText(request.body, ctx), options: { raw: { language: 'json' } } }
        : undefined;
    default:
      return request.body.trim() ? { mode: 'raw', raw: request.body } : undefined;
  }
}

function effectiveUrl(request: SavedRequest, ctx: Context): string {
  const url = request.url.trim();
  if (!url.startsWith('/')) return url;
  const folderBase = folderChain(request.folderId, ctx.folders).find((f) => normalizeBaseUrl(f.baseUrl))?.baseUrl;
  const base = normalizeBaseUrl(folderBase ?? ctx.collection.baseUrl);
  if (base) return base + url;
  ctx.warnings.push(`"${request.title}": caminho relativo sem URL base; exportado com {{baseUrl}}.`);
  return `{{baseUrl}}${url}`;
}

function postmanPath(path: string): string {
  return tokenizePath(path)
    .map((token) => (token.kind === 'param' && token.name !== WILDCARD_NAME ? `:${token.name}` : token.text))
    .join('');
}

function convertUrl(request: SavedRequest, ctx: Context): Json {
  const { base: rawBase, path: rawPath } = splitBaseAndPath(effectiveUrl(request, ctx));
  const base = rawBase.replace(/\/\/[^/@]+@/, '//');
  const path = postmanPath(rawPath);
  const query = convertRows(request.params, ctx);
  const enabled = query.filter((row) => !row.disabled);
  const escape = (text: unknown) => String(text).replace(/[&#]/g, encodeURIComponent);
  const search = enabled.map((row) => `${escape(row.key)}=${escape(row.value)}`).join('&');

  const origin = /^([a-z][a-z\d+.-]*):\/\/([^/:]+)(?::(\d+))?$/i.exec(base);
  const variables = extractPathParams(rawPath)
    .filter((param) => param.name !== WILDCARD_NAME)
    .map((param) => ({ key: param.name, value: request.pathValues[param.name] ?? '' }));

  return {
    raw: `${base}${path}${search ? `?${search}` : ''}`,
    ...(origin ? { protocol: origin[1], host: origin[2].split('.') } : base ? { host: [base] } : {}),
    ...(origin?.[3] ? { port: origin[3] } : {}),
    path: path.split('/').filter(Boolean),
    ...(query.length > 0 ? { query } : {}),
    ...(variables.length > 0 ? { variable: variables } : {}),
  };
}

function script(listen: string, source: string): Json[] {
  if (!source.trim()) return [];
  return [{ listen, script: { type: 'text/javascript', exec: source.split('\n') } }];
}

function convertRequest(request: SavedRequest, ctx: Context): Json {
  const auth = convertAuth(request.auth, ctx);
  const body = convertBody(request, ctx);
  const event = [...script('prerequest', request.preScript), ...script('test', request.postScript)];
  return {
    name: request.title,
    ...(event.length > 0 ? { event } : {}),
    request: {
      method: request.method.toUpperCase(),
      header: convertRows(request.headers, ctx),
      url: convertUrl(request, ctx),
      ...(auth ? { auth } : {}),
      ...(body ? { body } : {}),
      ...(request.doc?.description ? { description: request.doc.description } : {}),
    },
    response: [],
  };
}

function convertChildren(parentId: string | null, ctx: Context): Json[] {
  return treeChildren(ctx.collection.id, parentId, ctx.folders, ctx.requests).map((node) => {
    if (node.kind === 'request') return convertRequest(node.request, ctx);
    const auth = convertAuth(node.folder.auth, ctx);
    return { name: node.folder.name, item: convertChildren(node.folder.id, ctx), ...(auth ? { auth } : {}) };
  });
}

export function buildPostmanCollection(collection: Collection, folders: Folder[], requests: SavedRequest[]): PostmanExportResult {
  let omitted = 0;
  const warnings: string[] = [];
  const ctx: Context = {
    collection,
    folders,
    requests,
    warnings,
    secret: (value) => {
      if (!value.trim() || value.includes('{{')) return value;
      omitted += 1;
      return '';
    },
  };

  const auth = convertAuth(collection.auth, ctx);
  const document: Json = {
    info: { _postman_id: generateId(), name: collection.name, schema: SCHEMA },
    item: convertChildren(null, ctx),
    ...(auth ? { auth } : {}),
  };
  if (omitted > 0) warnings.push(`${omitted} valor(es) sensível(is) foram deixados em branco; {{variáveis}} são mantidas.`);
  return { document, warnings };
}

export function postmanFileName(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'colecao'}.postman_collection.json`;
}
