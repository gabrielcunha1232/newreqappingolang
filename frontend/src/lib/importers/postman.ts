import type { BodyType, Collection, Folder, KeyValue, RequestAuth, SavedRequest } from '../../types';
import { defaultAuth, defaultOAuth2, newKeyValue, newRequest } from '../factories';
import { generateId } from '../id';
import { uniqueName } from '../openapi/importOpenApi';
import { paramsFromUrl } from '../query';
import { asJson, asList, isJson, text, type CollectionImport, type Json } from './common';

interface WalkContext {
  collectionId: string;
  warn: (message: string) => void;
  requests: SavedRequest[];
  folders: Folder[];
  nextPosition: () => number;
}

function authOptions(auth: Json, type: string): Json {
  const raw = auth[type];
  if (Array.isArray(raw)) return Object.fromEntries(asList(raw).map((row) => [text(row.key), row.value]));
  return asJson(raw);
}

function description(value: unknown): string {
  return isJson(value) ? text(value.content) : text(value);
}

function rows(list: unknown): KeyValue[] {
  return asList(list).map((row) =>
    newKeyValue({
      key: text(row.key),
      value: text(row.value),
      enabled: row.disabled !== true,
      description: description(row.description),
    })
  );
}

function rawUrl(url: unknown): string {
  if (typeof url === 'string') return url;
  const data = asJson(url);
  if (typeof data.raw === 'string') return data.raw;
  const host = Array.isArray(data.host) ? data.host.join('.') : text(data.host);
  const path = Array.isArray(data.path) ? data.path.join('/') : text(data.path);
  const protocol = data.protocol ? `${text(data.protocol)}://` : '';
  return `${protocol}${host}${path ? `/${path}` : ''}`;
}

function convertAuth(auth: unknown, label: string, warn: (m: string) => void): { auth: RequestAuth; queryKey?: KeyValue } {
  const result = defaultAuth();
  if (!isJson(auth)) return { auth: result };
  const type = text(auth.type);
  const options = authOptions(auth, type);

  switch (type) {
    case 'bearer':
      return { auth: { ...result, type: 'bearer', token: text(options.token) } };
    case 'basic':
      return { auth: { ...result, type: 'basic', username: text(options.username), password: text(options.password) } };
    case 'apikey': {
      const pair = { key: text(options.key), value: text(options.value) };
      if (options.in === 'query') return { auth: result, queryKey: newKeyValue(pair) };
      return { auth: { ...result, type: 'apikey', apiKeyName: pair.key, apiKeyValue: pair.value } };
    }
    case 'oauth2': {
      const grant = text(options.grant_type);
      if (grant && grant !== 'client_credentials' && grant !== 'authorization_code' && grant !== 'authorization_code_with_pkce') {
        warn(`"${label}": OAuth2 "${grant}" não é suportado; configure outro fluxo na aba Autorização.`);
      }
      return {
        auth: {
          ...result,
          type: 'oauth2',
          oauth2: {
            ...defaultOAuth2(),
            grant: grant.startsWith('authorization_code') ? 'authorization_code' : 'client_credentials',
            tokenUrl: text(options.accessTokenUrl),
            authUrl: text(options.authUrl),
            redirectUri: text(options.redirect_uri) || defaultOAuth2().redirectUri,
            clientId: text(options.clientId),
            clientSecret: text(options.clientSecret),
            scope: text(options.scope),
            accessToken: text(options.accessToken),
          },
        },
      };
    }
    case 'noauth':
    case '':
      return { auth: result };
    default:
      warn(`"${label}": autenticação "${type}" não é suportada e foi ignorada.`);
      return { auth: result };
  }
}

type BodyFields = Pick<SavedRequest, 'bodyType' | 'body' | 'formFields' | 'graphqlVariables'>;

function convertBody(body: unknown, headers: KeyValue[], label: string, warn: (m: string) => void): BodyFields {
  const empty: BodyFields = { bodyType: 'json', body: '' };
  if (!isJson(body) || !body.mode) return empty;

  switch (body.mode) {
    case 'raw': {
      const language = text(asJson(asJson(body.options).raw).language);
      const contentType = headers.find((h) => h.key.toLowerCase() === 'content-type')?.value ?? '';
      const bodyType: BodyType = language === 'json' || /json/i.test(contentType) ? 'json' : 'text';
      return { bodyType, body: text(body.raw) };
    }
    case 'urlencoded':
      return { bodyType: 'form', body: '', formFields: rows(body.urlencoded) };
    case 'graphql': {
      const graphql = asJson(body.graphql);
      return { bodyType: 'graphql', body: text(graphql.query), graphqlVariables: text(graphql.variables) };
    }
    default:
      warn(`"${label}": corpo "${text(body.mode)}" não é suportado e foi ignorado.`);
      return empty;
  }
}

function eventScript(events: unknown, listen: string): string {
  const event = asList(events).find((item) => item.listen === listen);
  const exec = asJson(event?.script).exec;
  return Array.isArray(exec) ? exec.join('\n') : text(exec);
}

function isQueryApiKey(auth: unknown): boolean {
  return isJson(auth) && auth.type === 'apikey' && authOptions(auth, 'apikey').in === 'query';
}

function containerAuth(auth: unknown, label: string, warn: (m: string) => void): RequestAuth | undefined {
  if (!isJson(auth) || !auth.type || auth.type === 'inherit' || isQueryApiKey(auth)) return undefined;
  return convertAuth(auth, label, warn).auth;
}

function convertRequest(item: Json, title: string, folderId: string | null, inherited: unknown, ctx: WalkContext): SavedRequest {
  const source = typeof item.request === 'string' ? { url: item.request } : asJson(item.request);
  const headers = rows(source.header);
  const urlData = asJson(source.url);

  const ownAuth = source.auth;
  const useInherited = ownAuth === undefined || ownAuth === null || asJson(ownAuth).type === 'inherit';
  const { auth, queryKey } =
    useInherited && !isQueryApiKey(inherited)
      ? { auth: { ...defaultAuth(), type: isJson(inherited) ? ('inherit' as const) : ('none' as const) }, queryKey: undefined }
      : convertAuth(useInherited ? inherited : ownAuth, title, ctx.warn);

  let url = rawUrl(source.url);
  if (queryKey) url += `${url.includes('?') ? '&' : '?'}${queryKey.key}=${queryKey.value}`;
  const disabled = rows(urlData.query).filter((row) => !row.enabled);

  return {
    ...newRequest(ctx.collectionId),
    folderId,
    position: ctx.nextPosition(),
    title,
    method: text(source.method).toUpperCase() || 'GET',
    url,
    params: [...paramsFromUrl(url, []), ...disabled],
    pathValues: Object.fromEntries(asList(urlData.variable).map((row) => [text(row.key), text(row.value)])),
    headers,
    auth,
    ...convertBody(source.body, headers, title, ctx.warn),
    preScript: eventScript(item.event, 'prerequest'),
    postScript: eventScript(item.event, 'test'),
  };
}

function walk(items: unknown, parentId: string | null, inherited: unknown, ctx: WalkContext): void {
  for (const item of asList(items)) {
    const name = text(item.name) || 'Requisição';
    if (Array.isArray(item.item)) {
      if (eventScript(item.event, 'prerequest') || eventScript(item.event, 'test')) {
        ctx.warn(`Pasta "${name}": scripts de pasta não são suportados e foram ignorados.`);
      }
      const id = generateId();
      ctx.folders.push({
        id,
        collectionId: ctx.collectionId,
        parentId,
        name,
        collapsed: false,
        baseUrl: '',
        auth: containerAuth(item.auth, name, ctx.warn),
        position: ctx.nextPosition(),
      });
      const own = asJson(item.auth).type ? item.auth : undefined;
      walk(item.item, id, asJson(own).type === 'inherit' || !own ? inherited : own, ctx);
    } else {
      ctx.requests.push(convertRequest(item, name, parentId, inherited, ctx));
    }
  }
}

export function isPostmanCollection(data: Json): boolean {
  return /getpostman\.com\/json\/collection\/v2/.test(text(asJson(asJson(data.collection ?? data).info).schema));
}

export function importPostman(input: Json, existingNames: string[]): CollectionImport {
  const data = isJson(input.collection) ? input.collection : input;
  const warnings: string[] = [];
  const info = asJson(data.info);

  const name = uniqueName(text(info.name) || 'Coleção do Postman', existingNames);
  const warn = (message: string) => warnings.push(message);
  const collection: Collection = {
    id: generateId(),
    name,
    collapsed: false,
    baseUrl: '',
    auth: containerAuth(data.auth, name, warn),
  };
  let position = 0;
  const ctx: WalkContext = {
    collectionId: collection.id,
    warn,
    requests: [],
    folders: [],
    nextPosition: () => position++,
  };

  if (eventScript(data.event, 'prerequest') || eventScript(data.event, 'test')) {
    warnings.push('Scripts no nível da coleção não são suportados e foram ignorados.');
  }
  walk(data.item, null, data.auth, ctx);

  const variables = rows(data.variable);
  return {
    collection,
    requests: ctx.requests,
    folders: ctx.folders,
    environment: variables.length > 0 ? { name, variables } : undefined,
    warnings,
  };
}
