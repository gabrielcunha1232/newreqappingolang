import type { Response } from '../bindings/changeme/internal/models/models';
import type { TestResult } from './lib/scripts/types';

/* ===== Domínio ===== */

/** Linha editável de tabelas chave/valor (parâmetros, cabeçalhos, variáveis). */
export interface KeyValue {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  description: string;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';

export type BodyType = 'json' | 'text' | 'form' | 'graphql';

export type OAuth2Grant = 'client_credentials' | 'authorization_code';

/** Configuração e token atual do OAuth2. Os campos de texto aceitam {{variáveis}}. */
export interface OAuth2Settings {
  grant: OAuth2Grant;
  tokenUrl: string;
  authUrl: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  accessToken: string;
  refreshToken: string;
  /** Momento em que o token expira (ms desde a época); null = o servidor não informou. */
  expiresAt: number | null;
}

export interface RequestAuth {
  type: AuthType;
  token: string;
  username: string;
  password: string;
  apiKeyName: string;
  apiKeyValue: string;
  oauth2: OAuth2Settings;
}

export interface Collection {
  id: string;
  name: string;
  collapsed: boolean;
  /** URL usada como prefixo de caminhos relativos (ex.: "/albums"). Vazio = sem base. */
  baseUrl: string;
}

/**
 * De onde o endpoint foi descoberto pelo scanner de código. Independente de
 * linguagem: o scanner só preenche o que conseguir extrair.
 */
export interface ApiEndpointSource {
  file: string;
  line?: number;
  /** "go", "java", "php"... */
  language?: string;
  /** "gin", "echo", "spring", "laravel"... */
  framework?: string;
  handler?: string;
}

/** Requisição salva (aparece na árvore de coleções e pode estar aberta em uma aba). */
export interface SavedRequest {
  id: string;
  collectionId: string | null;
  title: string;
  method: string;
  url: string;
  params: KeyValue[];
  /** Valores das variáveis de caminho da URL (":id", "{id}"), por nome. */
  pathValues: Record<string, string>;
  headers: KeyValue[];
  auth: RequestAuth;
  bodyType: BodyType;
  body: string;
  /** Campos do corpo quando bodyType = 'form'. */
  formFields?: KeyValue[];
  /** Variáveis (JSON) quando bodyType = 'graphql'; a query fica em `body`. */
  graphqlVariables?: string;
  preScript: string;
  postScript: string;
  /** Presente quando a requisição veio do scanner de código. */
  source?: ApiEndpointSource;
  /** Documentação declarada pela origem (spec OpenAPI importada, scanner...). */
  doc?: ApiDocMetadata;
}

/**
 * O que a origem declarou sobre o endpoint e a requisição não guarda:
 * tipos, descrições, schemas e respostas. A requisição continua sendo a
 * fonte do método, da URL e dos exemplos; isto só complementa a documentação.
 */
export interface ApiDocMetadata {
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  /** Parâmetros declarados (casados com os da requisição por local + nome). */
  params?: ApiParam[];
  requestSchema?: JsonSchema;
  responses?: ApiResponseDoc[];
}

/* ===== Documentação da API (modelo neutro, estilo OpenAPI) ===== */

/**
 * Todas as fontes de endpoints (scanner, import OpenAPI/cURL, requisições
 * manuais) são convertidas para este modelo; a documentação só lê ele.
 */
export type ApiParamLocation = 'path' | 'query' | 'header';

export interface ApiParam {
  name: string;
  in: ApiParamLocation;
  required: boolean;
  /** Tipo para exibição ("integer (int64)", "array<string>"), quando a fonte souber. */
  type?: string;
  /** Schema declarado pela fonte (usado no export OpenAPI). */
  schema?: JsonSchema;
  description?: string;
  example?: string;
}

/** Subconjunto livre de JSON Schema, preenchido quando a fonte souber. */
export type JsonSchema = Record<string, unknown>;

export interface ApiRequestBody {
  contentType: string;
  example?: string;
  schema?: JsonSchema;
}

export interface ApiResponseDoc {
  /** "200", "404", "default"... */
  status: string;
  description?: string;
  contentType?: string;
  example?: string;
  schema?: JsonSchema;
}

export interface ApiSecurity {
  type: Exclude<AuthType, 'none' | 'oauth2'>;
  /** Nome do cabeçalho, para API key. */
  name?: string;
}

export interface ApiEndpoint {
  id: string;
  method: string;
  /** Caminho como escrito na fonte, sem origem e sem query ("/users/:id"). */
  path: string;
  /** Origem ou variável usada como base ("http://localhost:8080", "{{baseUrl}}"). */
  baseUrl?: string;
  summary?: string;
  description?: string;
  tags: string[];
  params: ApiParam[];
  requestBody?: ApiRequestBody;
  responses: ApiResponseDoc[];
  security?: ApiSecurity;
  deprecated?: boolean;
  source?: ApiEndpointSource;
  /** Requisição salva correspondente, usada pelo "Testar". */
  requestId?: string;
}

export interface ApiEndpointGroup {
  tag: string;
  endpoints: ApiEndpoint[];
}

/** Estado transitório de execução de uma requisição (não é persistido). */
export interface RequestRuntime {
  response: Response | null;
  /** Última resposta anterior a esta, para comparação. */
  previous: Response | null;
  error: string;
  loading: boolean;
  /** Resultados do pm.test no pós-processamento; null = não houve script. */
  tests: TestResult[] | null;
  /** Erro que interrompeu o script de pós-processamento. */
  scriptError: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
}

export interface HistoryEntry {
  id: string;
  requestId: string | null;
  method: string;
  url: string;
  status: number;
  timeSpent: number;
  timestamp: string;
}

export type LogLevel = 'info' | 'ok' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  time: string;
  message: string;
}

/* ===== UI ===== */

export type SidebarView = 'collections' | 'history' | 'apis';

/** Partes da requisição que podem ser destacadas como painéis próprios. */
export type RequestPart = 'params' | 'auth' | 'headers' | 'body';

export type PanelId = 'request' | 'env' | 'response' | 'console' | RequestPart;

export type MenuEntry =
  | { label: string; onSelect: () => void; checked?: boolean; shortcut?: string; danger?: boolean }
  | 'separator';

export interface MenuDefinition {
  label: string;
  items: MenuEntry[];
}

/* ===== Persistência ===== */

/** Forma gravada em disco pelo CollectionService (respostas não são persistidas). */
export interface PersistedState {
  collections: Collection[];
  /**
   * Arquivos antigos guardam `headers` como string JSON e não têm
   * params/auth/scripts; o persistenceService faz a migração na leitura.
   */
  requests: Array<Partial<Omit<SavedRequest, 'headers'>> & { id: string; headers?: KeyValue[] | string }>;
  openRequestIds?: string[];
  activeRequestId?: string | null;
  openDocIds?: string[];
  activeDocId?: string | null;
  environments?: Environment[];
  activeEnvironmentId?: string | null;
  history?: HistoryEntry[];
}
