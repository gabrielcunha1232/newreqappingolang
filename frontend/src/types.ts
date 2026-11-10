import type { Response } from '../bindings/changeme/internal/models/models';
import type { TestResult } from './lib/scripts/types';
import type { AppearanceSettings } from './lib/themes';


export interface KeyValue {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  description: string;
  secret?: boolean;
}

export type AuthType = 'none' | 'inherit' | 'bearer' | 'basic' | 'apikey' | 'oauth2';

export type BodyType = 'json' | 'text' | 'form' | 'graphql';

export type OAuth2Grant = 'client_credentials' | 'authorization_code';

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
  baseUrl: string;
  auth?: RequestAuth;
  groupByTag?: boolean;
  collapsedGroups?: string[];
}

export interface Folder {
  id: string;
  collectionId: string;
  parentId: string | null;
  name: string;
  collapsed: boolean;
  baseUrl: string;
  auth?: RequestAuth;
  position?: number;
}

export interface ApiEndpointSource {
  file: string;
  line?: number;
  language?: string;
  framework?: string;
  handler?: string;
}

export interface ResponseExtraction {
  id: string;
  path: string;
  variable: string;
}

export interface SavedRequest {
  id: string;
  collectionId: string | null;
  folderId?: string | null;
  position?: number;
  title: string;
  method: string;
  url: string;
  params: KeyValue[];
  pathValues: Record<string, string>;
  headers: KeyValue[];
  auth: RequestAuth;
  bodyType: BodyType;
  body: string;
  formFields?: KeyValue[];
  graphqlVariables?: string;
  preScript: string;
  postScript: string;
  extractions?: ResponseExtraction[];
  source?: ApiEndpointSource;
  doc?: ApiDocMetadata;
}

export interface ApiDocMetadata {
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  params?: ApiParam[];
  requestSchema?: JsonSchema;
  responses?: ApiResponseDoc[];
}


export type ApiParamLocation = 'path' | 'query' | 'header';

export interface ApiParam {
  name: string;
  in: ApiParamLocation;
  required: boolean;
  type?: string;
  schema?: JsonSchema;
  description?: string;
  example?: string;
}

export type JsonSchema = Record<string, unknown>;

export interface ApiRequestBody {
  contentType: string;
  example?: string;
  schema?: JsonSchema;
}

export interface ApiResponseDoc {
  status: string;
  description?: string;
  contentType?: string;
  example?: string;
  schema?: JsonSchema;
  schemaInferred?: boolean;
}

export interface ApiSecurity {
  type: Exclude<AuthType, 'none' | 'inherit' | 'oauth2'>;
  name?: string;
}

export interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
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
  requestId?: string;
}

export interface ApiEndpointGroup {
  tag: string;
  endpoints: ApiEndpoint[];
}

export interface RequestRuntime {
  response: Response | null;
  previous: Response | null;
  error: string;
  loading: boolean;
  tests: TestResult[] | null;
  scriptError: string;
  receivedAt?: string;
  restored?: boolean;
}

export type StoredResponse = Response & { savedAt: string };

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
  body?: string;
}

export type LogLevel = 'info' | 'ok' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  time: string;
  message: string;
}


export type SidebarView = 'collections' | 'history' | 'apis';

export type RequestPart = 'params' | 'auth' | 'headers' | 'body';

export type PanelId = 'request' | 'env' | 'response' | 'console' | RequestPart;

export type MenuEntry =
  | { label: string; onSelect: () => void; checked?: boolean; shortcut?: string; danger?: boolean }
  | 'separator';

export interface MenuDefinition {
  label: string;
  items: MenuEntry[];
}


export interface PersistedState {
  collections: Collection[];
  folders?: Folder[];
  requests: Array<Partial<Omit<SavedRequest, 'headers'>> & { id: string; headers?: KeyValue[] | string }>;
  openRequestIds?: string[];
  activeRequestId?: string | null;
  openDocIds?: string[];
  activeDocId?: string | null;
  environments?: Environment[];
  activeEnvironmentId?: string | null;
  history?: HistoryEntry[];
  responses?: Record<string, StoredResponse>;
  appearance?: AppearanceSettings;
}
