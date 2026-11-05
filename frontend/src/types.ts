import type { Response } from '../bindings/changeme/internal/models/models';

/* ===== Domínio ===== */

/** Linha editável de tabelas chave/valor (parâmetros, cabeçalhos, variáveis). */
export interface KeyValue {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  description: string;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

export interface RequestAuth {
  type: AuthType;
  token: string;
  username: string;
  password: string;
  apiKeyName: string;
  apiKeyValue: string;
}

export interface Collection {
  id: string;
  name: string;
  collapsed: boolean;
  /** URL usada como prefixo de caminhos relativos (ex.: "/albums"). Vazio = sem base. */
  baseUrl: string;
}

/** Requisição salva (aparece na árvore de coleções e pode estar aberta em uma aba). */
export interface SavedRequest {
  id: string;
  collectionId: string | null;
  title: string;
  method: string;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: RequestAuth;
  body: string;
  preScript: string;
  postScript: string;
}

/** Estado transitório de execução de uma requisição (não é persistido). */
export interface RequestRuntime {
  response: Response | null;
  error: string;
  loading: boolean;
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

export type PanelId = 'request' | 'env' | 'response' | 'console';

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
  environments?: Environment[];
  activeEnvironmentId?: string | null;
  history?: HistoryEntry[];
}
