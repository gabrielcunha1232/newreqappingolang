import type { KeyValue, SavedRequest } from '../types';

export interface SerializedBody {
  body: string;
  unresolvedText: string;
  contentType?: string;
  error?: string;
}

function activeRows(rows: KeyValue[] | undefined): KeyValue[] {
  return (rows ?? []).filter((row) => row.enabled && row.key.trim());
}

function graphqlBody(request: SavedRequest, sub: (text: string) => string): SerializedBody {
  const query = sub(request.body);
  const rawVariables = sub(request.graphqlVariables ?? '').trim();
  const unresolvedText = `${query}\n${rawVariables}`;
  if (!query.trim()) return { body: '', unresolvedText };

  let variables: unknown;
  if (rawVariables) {
    try {
      variables = JSON.parse(rawVariables);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return { body: '', unresolvedText, error: `Variáveis GraphQL não são um JSON válido: ${detail}` };
    }
  }
  return {
    body: JSON.stringify(variables === undefined ? { query } : { query, variables }),
    unresolvedText,
    contentType: 'application/json',
  };
}

export function serializeBody(request: SavedRequest, sub: (text: string) => string): SerializedBody {
  switch (request.bodyType) {
    case 'form': {
      const rows = activeRows(request.formFields).map((row) => [sub(row.key.trim()), sub(row.value)]);
      return {
        body: new URLSearchParams(rows).toString(),
        unresolvedText: rows.flat().join('\n'),
        contentType: 'application/x-www-form-urlencoded',
      };
    }
    case 'graphql':
      return graphqlBody(request, sub);
    case 'json': {
      const body = sub(request.body);
      return { body, unresolvedText: body, contentType: body.trim() ? 'application/json' : undefined };
    }
    default: {
      const body = sub(request.body);
      return { body, unresolvedText: body };
    }
  }
}

export function bodyExample(request: SavedRequest): string {
  switch (request.bodyType) {
    case 'form':
      return activeRows(request.formFields)
        .map((row) => `${row.key.trim()}=${row.value}`)
        .join('&');
    case 'graphql':
      return graphqlBody(request, (text) => text).body || request.body;
    default:
      return request.body;
  }
}

export function defaultContentType(request: SavedRequest): string {
  switch (request.bodyType) {
    case 'text':
      return 'text/plain';
    case 'form':
      return 'application/x-www-form-urlencoded';
    default:
      return 'application/json';
  }
}
