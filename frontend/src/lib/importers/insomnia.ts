import type { Collection, Folder, KeyValue, RequestAuth, SavedRequest } from '../../types';
import { defaultAuth, defaultOAuth2, newKeyValue, newRequest } from '../factories';
import { generateId } from '../id';
import { uniqueName } from '../openapi/importOpenApi';
import { urlWithParams } from '../query';
import { asJson, asList, isJson, text, type CollectionImport, type Json } from './common';

function convertTemplate(value: unknown): string {
  return text(value).replace(/\{\{\s*(?:_\.)?([\w.-]+)\s*\}\}/g, '{{$1}}');
}

function rows(list: unknown): KeyValue[] {
  return asList(list).map((row) =>
    newKeyValue({
      key: convertTemplate(row.name),
      value: convertTemplate(row.value),
      enabled: row.disabled !== true,
      description: text(row.description),
    })
  );
}

function convertAuth(source: unknown, label: string, warn: (m: string) => void): { auth: RequestAuth; queryKey?: KeyValue } {
  const result = defaultAuth();
  const auth = asJson(source);
  if (!auth.type || auth.type === 'none' || auth.disabled === true) return { auth: result };

  switch (auth.type) {
    case 'bearer':
      return { auth: { ...result, type: 'bearer', token: convertTemplate(auth.token) } };
    case 'basic':
      return { auth: { ...result, type: 'basic', username: convertTemplate(auth.username), password: convertTemplate(auth.password) } };
    case 'apikey': {
      const pair = { key: convertTemplate(auth.key), value: convertTemplate(auth.value) };
      if (auth.addTo === 'queryParams') return { auth: result, queryKey: newKeyValue(pair) };
      if (auth.addTo === 'cookie') {
        warn(`"${label}": API key em cookie não é suportada e foi ignorada.`);
        return { auth: result };
      }
      return { auth: { ...result, type: 'apikey', apiKeyName: pair.key, apiKeyValue: pair.value } };
    }
    case 'oauth2': {
      const grant = text(auth.grantType);
      if (grant !== 'client_credentials' && grant !== 'authorization_code') {
        warn(`"${label}": OAuth2 "${grant}" não é suportado; configure outro fluxo na aba Autorização.`);
      }
      return {
        auth: {
          ...result,
          type: 'oauth2',
          oauth2: {
            ...defaultOAuth2(),
            grant: grant === 'authorization_code' ? 'authorization_code' : 'client_credentials',
            tokenUrl: convertTemplate(auth.accessTokenUrl),
            authUrl: convertTemplate(auth.authorizationUrl),
            redirectUri: convertTemplate(auth.redirectUrl) || defaultOAuth2().redirectUri,
            clientId: convertTemplate(auth.clientId),
            clientSecret: convertTemplate(auth.clientSecret),
            scope: convertTemplate(auth.scope),
          },
        },
      };
    }
    default:
      warn(`"${label}": autenticação "${text(auth.type)}" não é suportada e foi ignorada.`);
      return { auth: result };
  }
}

type BodyFields = Pick<SavedRequest, 'bodyType' | 'body' | 'formFields' | 'graphqlVariables'>;

function convertBody(source: unknown, label: string, warn: (m: string) => void): BodyFields {
  const body = asJson(source);
  const mime = text(body.mimeType);
  const content = convertTemplate(body.text);

  if (mime === 'application/x-www-form-urlencoded') return { bodyType: 'form', body: '', formFields: rows(body.params) };
  if (mime === 'application/graphql') {
    try {
      const parsed = JSON.parse(content) as Json;
      return {
        bodyType: 'graphql',
        body: text(parsed.query),
        graphqlVariables: parsed.variables ? JSON.stringify(parsed.variables, null, 2) : '',
      };
    } catch {
      return { bodyType: 'text', body: content };
    }
  }
  if (mime === 'multipart/form-data' || body.fileName) {
    warn(`"${label}": corpo multipart ou de arquivo não é suportado e foi ignorado.`);
    return { bodyType: 'json', body: '' };
  }
  return { bodyType: /json/i.test(mime) || !mime ? 'json' : 'text', body: content };
}

interface Placement {
  collectionId: string;
  folderId: string | null;
  position: number;
  canInherit: boolean;
}

function convertRequest(resource: Json, title: string, place: Placement, warn: (m: string) => void): SavedRequest {
  const inherits = place.canInherit && !asJson(resource.authentication).type;
  const { auth, queryKey } = inherits
    ? { auth: { ...defaultAuth(), type: 'inherit' as const }, queryKey: undefined }
    : convertAuth(resource.authentication, title, warn);
  const params = [...rows(resource.parameters), ...(queryKey ? [queryKey] : [])];
  const url = convertTemplate(resource.url);
  return {
    ...newRequest(place.collectionId),
    folderId: place.folderId,
    position: place.position,
    title,
    method: text(resource.method).toUpperCase() || 'GET',
    url: params.length > 0 ? urlWithParams(url, params) : url,
    params,
    headers: rows(resource.headers),
    auth,
    ...convertBody(resource.body, title, warn),
  };
}

function flatten(data: Json, prefix = ''): KeyValue[] {
  return Object.entries(data).flatMap(([key, value]) =>
    isJson(value) ? flatten(value, `${prefix}${key}.`) : [newKeyValue({ key: `${prefix}${key}`, value: text(value) })]
  );
}

function collectEnvironment(resources: Json[], workspaceId: unknown, warnings: string[]): KeyValue[] {
  const base = resources.find((r) => r._type === 'environment' && r.parentId === workspaceId);
  if (!base) return [];
  const children = resources.filter((r) => r._type === 'environment' && r.parentId === base._id);
  if (children.length > 1) {
    warnings.push(`O export tem ${children.length} ambientes; só "${text(children[0].name)}" foi importado.`);
  }
  const merged = new Map<string, KeyValue>();
  for (const row of [...flatten(asJson(base.data)), ...flatten(asJson(children[0]?.data))]) merged.set(row.key, row);
  return [...merged.values()];
}

export function isInsomniaExport(data: Json): boolean {
  return data._type === 'export' && Array.isArray(data.resources);
}

export function importInsomnia(data: Json, existingNames: string[]): CollectionImport {
  if (Number(data.__export_format) !== 4) {
    throw new Error(`Formato ${text(data.__export_format)} do Insomnia não é suportado: exporte no formato 4 (JSON).`);
  }
  const resources = asList(data.resources);
  const warnings: string[] = [];
  const workspaces = resources.filter((r) => r._type === 'workspace');
  if (workspaces.length === 0) throw new Error('O export do Insomnia não tem nenhum workspace.');
  if (workspaces.length > 1) warnings.push(`O export tem ${workspaces.length} workspaces; só o primeiro foi importado.`);

  const workspace = workspaces[0];
  const name = uniqueName(text(workspace.name) || 'Coleção do Insomnia', existingNames);
  const collection: Collection = { id: generateId(), name, collapsed: false, baseUrl: '' };
  const requests: SavedRequest[] = [];
  const folders: Folder[] = [];
  let position = 0;

  const ignored = resources.filter((r) => /^(grpc_request|websocket_request)$/.test(text(r._type))).length;
  if (ignored > 0) warnings.push(`${ignored} requisição(ões) gRPC/WebSocket não são suportadas e foram ignoradas.`);

  const walk = (parentId: unknown, folderId: string | null, canInherit: boolean) => {
    const children = resources
      .filter((r) => r.parentId === parentId && (r._type === 'request' || r._type === 'request_group'))
      .sort((a, b) => Number(a.metaSortKey ?? 0) - Number(b.metaSortKey ?? 0));
    for (const child of children) {
      const label = text(child.name) || 'Requisição';
      const warn = (m: string) => warnings.push(m);
      if (child._type === 'request_group') {
        const groupAuth = asJson(child.authentication).type ? convertAuth(child.authentication, label, warn).auth : undefined;
        const id = generateId();
        folders.push({
          id,
          collectionId: collection.id,
          parentId: folderId,
          name: label,
          collapsed: false,
          baseUrl: '',
          auth: groupAuth,
          position: position++,
        });
        walk(child._id, id, canInherit || Boolean(groupAuth));
      } else {
        requests.push(
          convertRequest(child, label, { collectionId: collection.id, folderId, position: position++, canInherit }, warn)
        );
      }
    }
  };
  walk(workspace._id, null, false);

  if (resources.some((r) => r._type === 'request' && /\{%/.test(JSON.stringify(r)))) {
    warnings.push('Tags de template "{% %}" do Insomnia não têm equivalente e foram mantidas como texto.');
  }
  const variables = collectEnvironment(resources, workspace._id, warnings);
  return { collection, requests, folders, environment: variables.length > 0 ? { name, variables } : undefined, warnings };
}
