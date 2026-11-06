import type { JsonSchema } from '../../types';

/* Subconjunto do OpenAPI 3.0 que o app gera. */

export interface OpenApiServer {
  url: string;
  description?: string;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  description?: string;
  schema: JsonSchema;
  example?: string;
}

export interface OpenApiMediaType {
  schema?: JsonSchema;
  example?: unknown;
}

export interface OpenApiRequestBody {
  required?: boolean;
  content: Record<string, OpenApiMediaType>;
}

export interface OpenApiResponse {
  description: string;
  content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiOperation {
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  servers?: OpenApiServer[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
}

export type OpenApiPathItem = Partial<
  Record<'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace', OpenApiOperation>
>;

export type OpenApiSecurityScheme =
  | { type: 'http'; scheme: 'bearer' | 'basic' }
  | { type: 'apiKey'; in: 'header'; name: string };

export interface OpenApiDocument {
  openapi: '3.0.3';
  info: { title: string; version: string; description?: string };
  servers?: OpenApiServer[];
  tags?: Array<{ name: string }>;
  paths: Record<string, OpenApiPathItem>;
  components?: { securitySchemes?: Record<string, OpenApiSecurityScheme> };
}
