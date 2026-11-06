import type {
  ApiEndpoint,
  ApiEndpointGroup,
  ApiParam,
  ApiRequestBody,
  ApiSecurity,
  Collection,
  KeyValue,
  SavedRequest,
} from '../types';
import { HTTP_METHODS } from './factories';
import { extractPathParams, splitBaseAndPath, tagFromPath } from './pathTemplate';

/*
 * Adaptadores das fontes de endpoints para o modelo neutro ApiEndpoint.
 * Novas fontes (import OpenAPI, cURL, scanners de outras linguagens)
 * ganham um adaptador aqui; os componentes de documentação não mudam.
 */

/** Cabeçalhos que a documentação representa de outra forma (corpo e segurança). */
const IMPLICIT_HEADERS = new Set(['accept', 'content-type', 'authorization']);

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function named(rows: KeyValue[]): KeyValue[] {
  return rows.filter((row) => row.key.trim() !== '');
}

function optionalText(text: string): string | undefined {
  const trimmed = text.trim();
  return trimmed || undefined;
}

function pathParams(path: string, values: Record<string, string>): ApiParam[] {
  return extractPathParams(path).map((param) => ({
    name: param.name,
    in: 'path',
    required: !param.optional,
    description: param.wildcard ? 'Curinga: casa com o restante do caminho.' : undefined,
    example: optionalText(values[param.name] ?? ''),
  }));
}

function queryParams(request: SavedRequest): ApiParam[] {
  return named(request.params).map((row) => ({
    name: row.key.trim(),
    in: 'query',
    required: false,
    description: optionalText(row.description),
    example: optionalText(row.value),
  }));
}

function headerParams(request: SavedRequest, security: ApiSecurity | undefined): ApiParam[] {
  const apiKeyHeader = security?.type === 'apikey' ? security.name?.toLowerCase() : undefined;
  return named(request.headers)
    .filter((row) => {
      const key = row.key.trim().toLowerCase();
      return !IMPLICIT_HEADERS.has(key) && key !== apiKeyHeader;
    })
    .map((row) => ({
      name: row.key.trim(),
      in: 'header',
      required: row.enabled,
      description: optionalText(row.description),
      example: optionalText(row.value),
    }));
}

function requestBody(request: SavedRequest): ApiRequestBody | undefined {
  const example = request.body.trim();
  const schema = request.doc?.requestSchema;
  if ((!example && !schema) || !METHODS_WITH_BODY.has(request.method.toUpperCase())) return undefined;

  const contentTypeHeader = named(request.headers).find(
    (row) => row.enabled && row.key.trim().toLowerCase() === 'content-type'
  );
  const contentType =
    optionalText(contentTypeHeader?.value ?? '') ?? (request.bodyType === 'json' ? 'application/json' : 'text/plain');
  return { contentType, example: example || undefined, schema };
}

function paramKey(param: ApiParam): string {
  // Nomes de cabeçalho não diferenciam maiúsculas.
  return `${param.in}:${param.in === 'header' ? param.name.toLowerCase() : param.name}`;
}

/**
 * Completa os parâmetros da requisição com o que a origem declarou (tipo,
 * obrigatoriedade, descrição). A requisição manda: parâmetro removido dela
 * some da documentação.
 */
function withDeclared(params: ApiParam[], declared: ApiParam[] = []): ApiParam[] {
  const byKey = new Map(declared.map((param) => [paramKey(param), param]));
  return params.map((param) => {
    const info = byKey.get(paramKey(param));
    if (!info) return param;
    return {
      ...param,
      type: param.type ?? info.type,
      schema: param.schema ?? info.schema,
      required: param.in === 'path' ? param.required : info.required,
      description: param.description ?? info.description,
      example: param.example ?? info.example,
    };
  });
}

/** Só o tipo e o nome do cabeçalho: tokens e senhas nunca vão para a documentação. */
function security(request: SavedRequest): ApiSecurity | undefined {
  const { auth } = request;
  switch (auth.type) {
    case 'none':
      return undefined;
    case 'apikey':
      return { type: 'apikey', name: optionalText(auth.apiKeyName) };
    default:
      return { type: auth.type };
  }
}

/** Títulos gerados automaticamente não servem de resumo. */
function summary(request: SavedRequest): string | undefined {
  const title = request.title.trim();
  const generated = title === `${request.method} ${request.url}`.trim() || title === 'Nova requisição';
  return generated ? undefined : optionalText(title);
}

/** Converte uma requisição salva (de qualquer origem) em endpoint documentado. */
export function endpointFromRequest(request: SavedRequest, collection?: Collection): ApiEndpoint {
  const { base, path } = splitBaseAndPath(request.url);
  const auth = security(request);
  const { doc } = request;
  const params = [...pathParams(path, request.pathValues), ...queryParams(request), ...headerParams(request, auth)];

  return {
    id: request.id,
    method: request.method.toUpperCase(),
    path,
    baseUrl: base || collection?.baseUrl || undefined,
    summary: summary(request),
    description: doc?.description,
    tags: doc?.tags?.length ? doc.tags : [tagFromPath(path)],
    params: withDeclared(params, doc?.params),
    requestBody: requestBody(request),
    responses: doc?.responses ?? [],
    deprecated: doc?.deprecated,
    security: auth,
    source: request.source,
    requestId: request.id,
  };
}

function methodRank(method: string): number {
  const index = HTTP_METHODS.indexOf(method);
  return index === -1 ? HTTP_METHODS.length : index;
}

function compareEndpoints(a: ApiEndpoint, b: ApiEndpoint): number {
  return a.path.localeCompare(b.path) || methodRank(a.method) - methodRank(b.method);
}

/** Agrupa pela primeira tag (como o Swagger UI), em ordem alfabética. */
export function groupEndpoints(endpoints: ApiEndpoint[]): ApiEndpointGroup[] {
  const groups = new Map<string, ApiEndpoint[]>();
  for (const endpoint of endpoints) {
    const tag = endpoint.tags[0] ?? 'geral';
    groups.set(tag, [...(groups.get(tag) ?? []), endpoint]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, list]) => ({ tag, endpoints: [...list].sort(compareEndpoints) }));
}

export function matchesEndpoint(endpoint: ApiEndpoint, term: string): boolean {
  if (!term) return true;
  return [endpoint.method, endpoint.path, endpoint.summary ?? '', endpoint.tags.join(' ')]
    .join(' ')
    .toLowerCase()
    .includes(term);
}
