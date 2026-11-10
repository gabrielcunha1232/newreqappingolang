import type {
  ApiDocMetadata,
  ApiParam,
  ApiResponseDoc,
  BodyType,
  Collection,
  JsonSchema,
  KeyValue,
  RequestAuth,
  SavedRequest,
} from '../../types';
import { defaultAuth, newKeyValue, newRequest } from '../factories';
import { generateId } from '../id';
import { reconcileParams } from '../query';
import { normalizeBaseUrl } from '../url';
import { exampleFromSchema, schemaType } from './exampleFromSchema';
import { isObject, type SpecObject } from './parseSpec';
import { createRefResolver, type RefResolver } from './refs';


export interface OpenApiImportOptions {
  sourceUrl?: string;
  existingNames: string[];
}

export interface OpenApiImportResult {
  collection: Collection;
  requests: SavedRequest[];
  warnings: string[];
}

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

type Version = 2 | 3;

interface Context {
  version: Version;
  spec: SpecObject;
  refs: RefResolver;
  warn: (message: string) => void;
  securitySchemes: SpecObject;
  consumes: string[];
}


function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): SpecObject {
  return isObject(value) ? value : {};
}

function exampleText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function firstExample(examples: unknown, refs: RefResolver): unknown {
  const first = Object.values(asObject(examples))[0];
  return isObject(refs.resolve(first)) ? asObject(refs.resolve(first)).value : undefined;
}

function isJsonType(contentType: string): boolean {
  return /json/i.test(contentType);
}

function pickContentType(types: string[]): string | undefined {
  return types.find(isJsonType) ?? types[0];
}

export function uniqueName(name: string, existing: string[]): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name} (${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}


function declaredServer(ctx: Context): string | undefined {
  if (ctx.version === 3) {
    const server = asObject(asArray(ctx.spec.servers)[0]);
    const url = asString(server.url);
    if (!url) return undefined;
    const variables = asObject(server.variables);
    return url.replace(/\{([^}]+)\}/g, (match, name: string) => exampleText(asObject(variables[name]).default) ?? match);
  }

  const host = asString(ctx.spec.host);
  const basePath = asString(ctx.spec.basePath) ?? '';
  if (!host) return basePath || undefined;
  const scheme = asString(asArray(ctx.spec.schemes)[0]) ?? 'https';
  return `${scheme}://${host}${basePath}`;
}

function resolveServer(ctx: Context, sourceUrl: string | undefined): { baseUrl: string; pathPrefix: string } {
  const declared = declaredServer(ctx);
  if (!declared) {
    if (sourceUrl) return { baseUrl: normalizeBaseUrl(new URL(sourceUrl).origin), pathPrefix: '' };
    ctx.warn('A especificação não declara servidor: defina a URL base da coleção para enviar as requisições.');
    return { baseUrl: '', pathPrefix: '' };
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(declared)) return { baseUrl: normalizeBaseUrl(declared), pathPrefix: '' };

  if (sourceUrl) {
    try {
      return { baseUrl: normalizeBaseUrl(new URL(declared, sourceUrl).href), pathPrefix: '' };
    } catch {
    }
  }

  ctx.warn(`Servidor relativo "${declared}": defina a URL base da coleção para enviar as requisições.`);
  const prefix = normalizeBaseUrl(declared);
  return { baseUrl: '', pathPrefix: prefix === '/' ? '' : prefix };
}


function typeLabel(schema: SpecObject): string | undefined {
  const type = schemaType(schema);
  if (!type) return undefined;
  if (type === 'array') {
    const itemType = typeLabel(asObject(schema.items));
    return itemType ? `array<${itemType}>` : 'array';
  }
  const format = asString(schema.format);
  return format ? `${type} (${format})` : type;
}

interface OperationParam {
  name: string;
  in: string;
  required: boolean;
  description?: string;
  schema: SpecObject;
  example?: string;
  raw: SpecObject;
}

function collectParams(ctx: Context, pathItem: SpecObject, operation: SpecObject): OperationParam[] {
  const byKey = new Map<string, OperationParam>();
  for (const entry of [...asArray(pathItem.parameters), ...asArray(operation.parameters)]) {
    const raw = asObject(ctx.refs.resolve(entry));
    const name = asString(raw.name);
    const location = asString(raw.in);
    if (!name || !location) continue;

    const schema = ctx.version === 3 ? asObject(ctx.refs.deref(raw.schema)) : swagger2ParamSchema(ctx, raw);
    const example = raw.example ?? firstExample(raw.examples, ctx.refs) ?? schemaExample(schema);

    byKey.set(`${location}:${name}`, {
      name,
      in: location,
      required: raw.required === true || location === 'path',
      description: asString(raw.description),
      schema,
      example: exampleText(example),
      raw,
    });
  }
  return [...byKey.values()];
}

const SWAGGER2_SCHEMA_KEYS = ['type', 'format', 'items', 'enum', 'default', 'minimum', 'maximum', 'pattern', 'minLength', 'maxLength'];

function swagger2ParamSchema(ctx: Context, raw: SpecObject): SpecObject {
  const picked = Object.fromEntries(SWAGGER2_SCHEMA_KEYS.filter((key) => raw[key] !== undefined).map((key) => [key, raw[key]]));
  return asObject(ctx.refs.deref(picked));
}

function schemaExample(schema: SpecObject): unknown {
  const own = schema.example ?? schema.default ?? asArray(schema.enum)[0];
  if (own !== undefined || schemaType(schema) !== 'array') return own;
  const items = asObject(schema.items);
  return items.example ?? items.default ?? asArray(items.enum)[0];
}

function declaredParam(param: OperationParam): ApiParam {
  return {
    name: param.name,
    in: param.in as ApiParam['in'],
    required: param.required,
    type: typeLabel(param.schema),
    schema: Object.keys(param.schema).length > 0 ? param.schema : undefined,
    description: param.description,
    example: param.example,
  };
}

function paramRow(param: OperationParam): KeyValue {
  return newKeyValue({
    key: param.name,
    value: param.example ?? '',
    enabled: param.required,
    description: param.description ?? '',
  });
}


interface AuthResult {
  auth: RequestAuth;
  queryRows: KeyValue[];
}

function operationAuth(ctx: Context, operation: SpecObject): AuthResult {
  const requirements = asArray(operation.security ?? ctx.spec.security);
  const schemeName = Object.keys(asObject(requirements[0]))[0];
  const none = { auth: defaultAuth(), queryRows: [] };
  if (!schemeName) return none;

  const scheme = asObject(ctx.refs.resolve(ctx.securitySchemes[schemeName]));
  const type = asString(scheme.type)?.toLowerCase();
  const httpScheme = asString(scheme.scheme)?.toLowerCase();

  if (type === 'basic' || (type === 'http' && httpScheme === 'basic')) {
    return { auth: { ...defaultAuth(), type: 'basic' }, queryRows: [] };
  }
  if (type === 'http' || type === 'oauth2' || type === 'openidconnect') {
    return { auth: { ...defaultAuth(), type: 'bearer' }, queryRows: [] };
  }
  if (type === 'apikey') {
    const name = asString(scheme.name) ?? 'X-API-Key';
    const location = asString(scheme.in);
    if (location === 'header') return { auth: { ...defaultAuth(), type: 'apikey', apiKeyName: name }, queryRows: [] };
    if (location === 'query') return { auth: defaultAuth(), queryRows: [newKeyValue({ key: name, description: 'API key' })] };
    ctx.warn(`Esquema de segurança "${schemeName}" (API key em ${location ?? '?'}) não é suportado; configure a autorização manualmente.`);
  }
  return none;
}


interface BodyResult {
  bodyType: BodyType;
  body: string;
  contentType?: string;
  schema?: JsonSchema;
}

const EMPTY_BODY: BodyResult = { bodyType: 'json', body: '' };

function formEncode(value: unknown): string {
  return Object.entries(asObject(value))
    .map(([key, item]) => `${key}=${exampleText(item) ?? ''}`)
    .join('&');
}

function bodyFromMedia(ctx: Context, label: string, contentType: string, schema: SpecObject, example: unknown): BodyResult {
  const value = example ?? exampleFromSchema(schema, 'request');
  const result = { contentType, schema: Object.keys(schema).length > 0 ? schema : undefined };

  if (isJsonType(contentType)) {
    return { ...result, bodyType: 'json', body: value === undefined ? '' : JSON.stringify(value, null, 2) };
  }
  if (/x-www-form-urlencoded/i.test(contentType)) {
    return { ...result, bodyType: 'text', body: formEncode(value) };
  }
  if (/multipart/i.test(contentType)) {
    ctx.warn(`${label}: corpo multipart/form-data ainda não é suportado; corpo deixado vazio.`);
    return { ...result, bodyType: 'text', body: '' };
  }
  return { ...result, bodyType: 'text', body: exampleText(value) ?? '' };
}

function requestBodyV3(ctx: Context, label: string, operation: SpecObject): BodyResult {
  const requestBody = asObject(ctx.refs.resolve(operation.requestBody));
  const content = asObject(requestBody.content);
  const contentType = pickContentType(Object.keys(content));
  if (!contentType) return EMPTY_BODY;

  const media = asObject(content[contentType]);
  const schema = asObject(ctx.refs.deref(media.schema));
  const example = media.example ?? firstExample(media.examples, ctx.refs);
  return bodyFromMedia(ctx, label, contentType, schema, example);
}

function requestBodyV2(ctx: Context, label: string, operation: SpecObject, params: OperationParam[]): BodyResult {
  const consumes = asArray(operation.consumes ?? ctx.consumes).filter((t): t is string => typeof t === 'string');
  const bodyParam = params.find((p) => p.in === 'body');
  if (bodyParam) {
    const schema = asObject(ctx.refs.deref(bodyParam.raw.schema));
    return bodyFromMedia(ctx, label, pickContentType(consumes) ?? 'application/json', schema, undefined);
  }

  const formParams = params.filter((p) => p.in === 'formData');
  if (formParams.length === 0) return EMPTY_BODY;
  if (formParams.some((p) => p.raw.type === 'file') || consumes.some((t) => /multipart/i.test(t))) {
    ctx.warn(`${label}: corpo multipart/form-data ainda não é suportado; corpo deixado vazio.`);
    return { bodyType: 'text', body: '', contentType: 'multipart/form-data' };
  }
  const values = Object.fromEntries(formParams.map((p) => [p.name, p.example ?? '']));
  return { bodyType: 'text', body: formEncode(values), contentType: 'application/x-www-form-urlencoded' };
}


function responseDocs(ctx: Context, operation: SpecObject): ApiResponseDoc[] {
  return Object.entries(asObject(operation.responses)).map(([status, entry]) => {
    const response = asObject(ctx.refs.resolve(entry));
    let contentType: string | undefined;
    let schema: SpecObject = {};
    let example: unknown;

    if (ctx.version === 3) {
      const content = asObject(response.content);
      contentType = pickContentType(Object.keys(content));
      const media = asObject(contentType ? content[contentType] : undefined);
      schema = asObject(ctx.refs.deref(media.schema));
      example = media.example ?? firstExample(media.examples, ctx.refs);
    } else {
      schema = asObject(ctx.refs.deref(response.schema));
      const examples = asObject(response.examples);
      contentType = pickContentType(Object.keys(examples)) ?? (Object.keys(schema).length > 0 ? 'application/json' : undefined);
      example = contentType ? examples[contentType] : undefined;
    }

    const hasSchema = Object.keys(schema).length > 0;
    const value = example ?? (hasSchema ? exampleFromSchema(schema, 'response') : undefined);
    return {
      status,
      description: asString(response.description),
      contentType,
      schema: hasSchema ? schema : undefined,
      example:
        value === undefined ? undefined : contentType && isJsonType(contentType) ? JSON.stringify(value, null, 2) : exampleText(value),
    };
  });
}


function buildRequest(
  ctx: Context,
  collectionId: string,
  pathPrefix: string,
  path: string,
  method: string,
  pathItem: SpecObject,
  operation: SpecObject
): SavedRequest {
  const METHOD = method.toUpperCase();
  const label = `${METHOD} ${path}`;
  const params = collectParams(ctx, pathItem, operation);

  const cookies = params.filter((p) => p.in === 'cookie');
  if (cookies.length > 0) ctx.warn(`${label}: parâmetros em cookie (${cookies.map((p) => p.name).join(', ')}) não são suportados.`);

  const { auth, queryRows: authQuery } = operationAuth(ctx, operation);
  const body = ctx.version === 3 ? requestBodyV3(ctx, label, operation) : requestBodyV2(ctx, label, operation, params);

  const headerRows = [newKeyValue({ key: 'Accept', value: 'application/json' })];
  if (body.contentType && !isJsonType(body.contentType)) {
    headerRows.push(newKeyValue({ key: 'Content-Type', value: body.contentType }));
  }

  const documented = params.filter((p) => p.in === 'path' || p.in === 'query' || p.in === 'header');
  const summary = asString(operation.summary);
  const doc: ApiDocMetadata = {
    description: asString(operation.description),
    tags: asArray(operation.tags).filter((t): t is string => typeof t === 'string'),
    deprecated: operation.deprecated === true || undefined,
    params: documented.map(declaredParam),
    requestSchema: body.schema,
    responses: responseDocs(ctx, operation),
  };

  return reconcileParams({
    ...newRequest(collectionId),
    title: summary ?? asString(operation.operationId) ?? label,
    method: METHOD,
    url: pathPrefix + path,
    params: [...documented.filter((p) => p.in === 'query').map(paramRow), ...authQuery],
    pathValues: Object.fromEntries(
      documented.filter((p) => p.in === 'path' && p.example !== undefined).map((p) => [p.name, p.example ?? ''])
    ),
    headers: [...headerRows, ...documented.filter((p) => p.in === 'header').map(paramRow)],
    auth,
    bodyType: body.bodyType,
    body: body.body,
    doc,
  });
}


export function importOpenApi(spec: SpecObject, options: OpenApiImportOptions): OpenApiImportResult {
  const warnings: string[] = [];
  const warn = (message: string) => warnings.push(message);

  const version: Version | undefined =
    typeof spec.openapi === 'string' && spec.openapi.startsWith('3')
      ? 3
      : String(spec.swagger ?? '').startsWith('2')
        ? 2
        : undefined;
  if (!version) {
    throw new Error(`Versão não suportada (${String(spec.openapi ?? spec.swagger ?? 'desconhecida')}). Use OpenAPI 3.x ou Swagger 2.0.`);
  }

  const ctx: Context = {
    version,
    spec,
    refs: createRefResolver(spec, warn),
    warn,
    securitySchemes: asObject(version === 3 ? asObject(spec.components).securitySchemes : spec.securityDefinitions),
    consumes: asArray(spec.consumes).filter((t): t is string => typeof t === 'string'),
  };

  const info = asObject(spec.info);
  const { baseUrl, pathPrefix } = resolveServer(ctx, options.sourceUrl);
  const collection: Collection = {
    id: generateId(),
    name: uniqueName(asString(info.title) ?? 'API importada', options.existingNames),
    collapsed: false,
    baseUrl,
  };

  const requests: SavedRequest[] = [];
  for (const [path, entry] of Object.entries(asObject(spec.paths))) {
    const pathItem = asObject(ctx.refs.resolve(entry));
    for (const method of METHODS) {
      const operation = pathItem[method];
      if (isObject(operation)) {
        requests.push(buildRequest(ctx, collection.id, pathPrefix, path, method, pathItem, operation));
      }
    }
  }

  if (requests.length === 0) warn('Nenhuma operação encontrada em "paths".');
  return { collection, requests, warnings };
}
