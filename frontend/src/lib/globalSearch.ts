import type { Collection, Environment, Folder, MenuDefinition, SavedRequest } from '../types';
import { folderChain, folderPath } from './tree';

export type SearchKind = 'request' | 'folder' | 'collection' | 'environment' | 'command';

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  method?: string;
  shortcut?: string;
  extra?: string;
  run: () => void;
}

export interface IndexedItem {
  item: SearchItem;
  title: string;
  subtitle: string;
  extra: string;
}

export interface SearchHandlers {
  openRequest: (id: string) => void;
  revealCollection: (id: string) => void;
  revealFolder: (folderIds: string[], collectionId: string) => void;
  selectEnvironment: (environment: Environment) => void;
}

export interface SearchSources {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  openRequestIds: string[];
  environments: Environment[];
  menus: MenuDefinition[];
  excludedCommands: string[];
}

const KIND_ORDER: SearchKind[] = ['request', 'folder', 'collection', 'environment', 'command'];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function indexItems(items: SearchItem[]): IndexedItem[] {
  return items.map((item) => ({
    item,
    title: normalize(item.title),
    subtitle: normalize(`${item.method ?? ''} ${item.subtitle}`),
    extra: normalize(item.extra ?? ''),
  }));
}

function tokenScore(entry: IndexedItem, token: string): number {
  if (entry.title === token) return 150;
  if (entry.title.startsWith(token)) return 100;
  const position = entry.title.indexOf(token);
  if (position > 0) return /[\s/_.-]/.test(entry.title[position - 1]) ? 80 : 60;
  if (entry.subtitle.includes(token)) return 30;
  return entry.extra.includes(token) ? 10 : 0;
}

export function searchIndex(index: IndexedItem[], term: string, limit = 50): SearchItem[] {
  const tokens = normalize(term).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return index.slice(0, limit).map((entry) => entry.item);

  const scored: Array<{ entry: IndexedItem; score: number }> = [];
  for (const entry of index) {
    const scores = tokens.map((token) => tokenScore(entry, token));
    if (scores.every((score) => score > 0)) scored.push({ entry, score: scores.reduce((a, b) => a + b, 0) });
  }
  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        KIND_ORDER.indexOf(a.entry.item.kind) - KIND_ORDER.indexOf(b.entry.item.kind) ||
        a.entry.item.title.localeCompare(b.entry.item.title)
    )
    .slice(0, limit)
    .map(({ entry }) => entry.item);
}

export function buildSearchItems(sources: SearchSources, handlers: SearchHandlers): SearchItem[] {
  const { collections, folders, requests, openRequestIds, environments, menus, excludedCommands } = sources;
  const collectionName = (id: string | null) => collections.find((c) => c.id === id)?.name ?? 'Sem grupo';

  const requestItem = (request: SavedRequest): SearchItem => {
    const folder = folders.find((f) => f.id === request.folderId);
    const location = [collectionName(request.collectionId), folder && folderPath(folder, folders)].filter(Boolean).join(' / ');
    return {
      id: `request:${request.id}`,
      kind: 'request',
      title: request.title,
      subtitle: `${location} · ${request.url}`,
      method: request.method,
      extra: `${request.body} ${request.graphqlVariables ?? ''}`,
      run: () => handlers.openRequest(request.id),
    };
  };

  const opened = openRequestIds.flatMap((id) => requests.filter((request) => request.id === id));
  const others = requests.filter((request) => !openRequestIds.includes(request.id));

  return [
    ...[...opened, ...others].map(requestItem),
    ...folders.map(
      (folder): SearchItem => ({
        id: `folder:${folder.id}`,
        kind: 'folder',
        title: folder.name,
        subtitle: `${collectionName(folder.collectionId)} / ${folderPath(folder, folders)}`,
        run: () => handlers.revealFolder(folderChain(folder.id, folders).map((f) => f.id), folder.collectionId),
      })
    ),
    ...collections.map(
      (collection): SearchItem => ({
        id: `collection:${collection.id}`,
        kind: 'collection',
        title: collection.name,
        subtitle: collection.baseUrl,
        run: () => handlers.revealCollection(collection.id),
      })
    ),
    ...environments.map(
      (environment): SearchItem => ({
        id: `environment:${environment.id}`,
        kind: 'environment',
        title: environment.name,
        subtitle: `${environment.variables.length} variável(is)`,
        run: () => handlers.selectEnvironment(environment),
      })
    ),
    ...menus.flatMap((menu) =>
      menu.items.flatMap((entry): SearchItem[] => {
        if (entry === 'separator' || excludedCommands.includes(entry.label)) return [];
        return [
          {
            id: `command:${menu.label}:${entry.label}`,
            kind: 'command',
            title: entry.label,
            subtitle: menu.label,
            shortcut: entry.shortcut,
            run: entry.onSelect,
          },
        ];
      })
    ),
  ];
}
