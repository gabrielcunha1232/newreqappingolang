import type { ApiEndpoint, ApiParam, ApiSecurity, JsonSchema } from '../../types';
import { tryParseJson } from '../json';
import { tokenizePath } from '../pathTemplate';
import { isSensitiveName } from '../secrets';
import { interpolate } from '../variables';
import { inferSchema } from './inferSchema';
import { toOas30Schema } from './toOas30Schema';
import type {
  OpenApiDocument,
  OpenApiMediaType,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiResponse,
  OpenApiSecurityScheme,
  OpenApiServer,
} from './types';


export interface OpenApiExportInput {
  title: string;
  endpoints: ApiEndpoint[];
  variables: Record<string, string>;
}

export interface OpenApiExportResult {
  document: OpenApiDocument;
  warnings: string[];
}

const OPENAPI_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
const REDACTED = '***';

type Method = keyof OpenApiPathItem;


interface ConvertedPath {
  path: string;
  variables: string[];
  optional: Set<string>;
}

export function toOpenApiPath(path: string): ConvertedPath {
  const variables: string[] = [];
  const optional = new Set<string>();

  const converted = tokenizePath(path)
    .map((token) => {
      switch (token.kind) {
        case 'text':
          return token.text;
        case 'variable':
          variables.push(token.name);
          return `{${token.name}}`;
        case 'param': {
          const name = paramName(token.name);
          if (token.optional) optional.add(name);
          return `{${name}}`;
        }
      }
    })
    .join('');

  return { path: converted.startsWith('/') ? converted : `/${converted}`, variables, optional };
}

function paramName(name: string): string {
  return name === '*' ? 'wildcard' : name;
}

function operationId(method: string, path: string, used: Set<string>): string {
  const words = path
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      const param = /^\{(.+)\}$/.exec(segment);
      const text = param ? `by ${param[1]}` : segment;
      return text
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join('');
    })
    .join('');

  const base = method.toLowerCase() + (words || 'Root');
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}${n}`;
  used.add(id);
  return id;
}


function resolveServerUrl(base: string | undefined, variables: Record<string, string>): string | undefined {
  if (!base) return undefined;
  const url = interpolate(base, variables).trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(url) || url.startsWith('/') ? url : undefined;
}

function primaryServer(urls: Array<string | undefined>): string | undefined {
  const counts = new Map<string, number>();
  for (const url of urls) if (url) counts.set(url, (counts.get(url) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}


function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        isSensitiveName(key) && typeof item !== 'object' ? REDACTED : redactSensitive(item),
      ])
    );
  }
  return value;
}

function mediaType(example: string | undefined, contentType: string, declared: JsonSchema | undefined): OpenApiMediaType {
  const schema = declared && toOas30Schema(declared);
  if (!example) return schema ? { schema } : {};

  if (/json/i.test(contentType)) {
    const parsed = tryParseJson(example);
    if (parsed.ok) return { schema: schema ?? inferSchema(parsed.value), example: redactSensitive(parsed.value) };
  }
  return { schema: schema ?? { type: 'string' }, example };
}

const PRIMITIVE_TYPES = new Set(['string', 'integer', 'number', 'boolean', 'array', 'object']);

function primitiveType(label: string | undefined): string {
  const type = label?.match(/^[a-z]+/)?.[0];
  return type && PRIMITIVE_TYPES.has(type) && type !== 'array' && type !== 'object' ? type : 'string';
}

function shareableExample(param: ApiParam): string | undefined {
  if (!param.example || param.example.includes('{{')) return undefined;
  if (param.in !== 'path' && isSensitiveName(param.name)) return undefined;
  return param.example;
}

function parameters(endpoint: ApiEndpoint, converted: ConvertedPath): OpenApiParameter[] {
  const seen = new Set<string>();
  const result: OpenApiParameter[] = [];

  const add = (param: OpenApiParameter) => {
    const key = `${param.in}:${param.name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(param);
  };

  for (const param of endpoint.params) {
    const name = param.in === 'path' ? paramName(param.name) : param.name;
    const notes = [param.description, converted.optional.has(name) ? 'Opcional na rota original.' : undefined];
    add({
      name,
      in: param.in,
      required: param.in === 'path' ? true : param.required,
      description: notes.filter(Boolean).join(' ') || undefined,
      schema: param.schema ? toOas30Schema(param.schema) : { type: primitiveType(param.type) },
      example: shareableExample(param),
    });
  }

  for (const variable of converted.variables) {
    add({
      name: variable,
      in: 'path',
      required: true,
      description: `Variável de ambiente {{${variable}}} no caminho.`,
      schema: { type: 'string' },
    });
  }

  return result;
}

function responses(endpoint: ApiEndpoint): Record<string, OpenApiResponse> {
  if (endpoint.responses.length === 0) return { default: { description: 'Resposta não documentada.' } };

  return Object.fromEntries(
    endpoint.responses.map((response) => {
      const contentType = response.contentType ?? 'application/json';
      const media = mediaType(response.example, contentType, response.schema);
      const hasContent = media.schema !== undefined || media.example !== undefined;
      return [
        response.status,
        {
          description: response.description ?? `Resposta ${response.status}.`,
          ...(hasContent ? { content: { [contentType]: media } } : {}),
        },
      ];
    })
  );
}


function securityScheme(security: ApiSecurity): [string, OpenApiSecurityScheme] {
  switch (security.type) {
    case 'bearer':
      return ['bearerAuth', { type: 'http', scheme: 'bearer' }];
    case 'basic':
      return ['basicAuth', { type: 'http', scheme: 'basic' }];
    case 'apikey': {
      const name = security.name ?? 'X-API-Key';
      return [`apiKey_${name.replace(/[^A-Za-z0-9_.-]/g, '_')}`, { type: 'apiKey', in: 'header', name }];
    }
  }
}


export function buildOpenApiDocument({ title, endpoints, variables }: OpenApiExportInput): OpenApiExportResult {
  const warnings: string[] = [];
  const paths: Record<string, OpenApiPathItem> = {};
  const schemes: Record<string, OpenApiSecurityScheme> = {};
  const tags = new Set<string>();
  const usedIds = new Set<string>();

  const serverUrls = endpoints.map((e) => resolveServerUrl(e.baseUrl, variables));
  const primary = primaryServer(serverUrls);

  endpoints.forEach((endpoint, index) => {
    const method = endpoint.method.toLowerCase();
    const label = `${endpoint.method} ${endpoint.path}`;

    if (!OPENAPI_METHODS.has(method)) {
      warnings.push(`${label}: método não suportado pelo OpenAPI, ignorado.`);
      return;
    }

    const converted = toOpenApiPath(endpoint.path);
    const item = (paths[converted.path] ??= {});
    if (item[method as Method]) {
      warnings.push(`${label}: repete ${endpoint.method} ${converted.path}; mantido apenas o primeiro.`);
      return;
    }

    const serverUrl = serverUrls[index];
    if (endpoint.baseUrl && !serverUrl) {
      warnings.push(`${label}: não foi possível resolver a base "${endpoint.baseUrl}" com o ambiente ativo.`);
    }

    const params = parameters(endpoint, converted);
    const operation: OpenApiOperation = {
      operationId: operationId(method, converted.path, usedIds),
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags.length > 0 ? endpoint.tags : undefined,
      deprecated: endpoint.deprecated || undefined,
      servers: serverUrl && serverUrl !== primary ? [{ url: serverUrl }] : undefined,
      parameters: params.length > 0 ? params : undefined,
      requestBody: endpoint.requestBody && {
        required: true,
        content: {
          [endpoint.requestBody.contentType]: mediaType(
            endpoint.requestBody.example,
            endpoint.requestBody.contentType,
            endpoint.requestBody.schema
          ),
        },
      },
      responses: responses(endpoint),
    };

    if (endpoint.security) {
      const [key, scheme] = securityScheme(endpoint.security);
      schemes[key] = scheme;
      operation.security = [{ [key]: [] }];
    }

    endpoint.tags.forEach((tag) => tags.add(tag));
    item[method as Method] = withoutUndefined(operation);
  });

  const servers: OpenApiServer[] = primary ? [{ url: primary }] : [];
  if (!primary && endpoints.length > 0) {
    warnings.push('Nenhuma URL base resolvida: defina a URL base da coleção para preencher "servers".');
  }

  const document: OpenApiDocument = {
    openapi: '3.0.3',
    info: { title, version: '1.0.0', description: 'Gerado pelo Forkarsenet.' },
    ...(servers.length > 0 ? { servers } : {}),
    ...(tags.size > 0 ? { tags: [...tags].sort().map((name) => ({ name })) } : {}),
    paths: sortKeys(paths),
    ...(Object.keys(schemes).length > 0 ? { components: { securitySchemes: schemes } } : {}),
  };

  return { document, warnings };
}

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

function sortKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

export function openApiFileName(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'api'}.openapi.json`;
}
