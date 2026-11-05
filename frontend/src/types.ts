import type { Response } from '../bindings/changeme/internal/models/models';

export interface Collection {
  id: string;
  name: string;
  collapsed: boolean;
}

export interface Tab {
  id: string;
  collectionId: string | null;
  method: string;
  url: string;
  headers: string;
  body: string;
  response: Response | null;
  error: string;
  loading: boolean;
  title: string;
}

/** Forma gravada em disco pelo CollectionService (respostas não são persistidas). */
export interface PersistedState {
  collections: Collection[];
  requests: Array<
    Pick<Tab, 'id' | 'collectionId' | 'title' | 'method' | 'url' | 'headers' | 'body'>
  >;
}
