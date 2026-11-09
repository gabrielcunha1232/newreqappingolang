import type { Collection, Folder, RequestAuth, SavedRequest } from '../types';
import { defaultAuth } from './factories';
import { normalizeBaseUrl } from './url';

export type TreeNode = { kind: 'folder'; folder: Folder } | { kind: 'request'; request: SavedRequest };

export interface TreeDragNode {
  kind: 'folder' | 'request';
  id: string;
}

export interface TreeDropTarget {
  collectionId: string | null;
  parentId: string | null;
  anchorId: string | null;
  after: boolean;
}

export type AuthOwner ={ kind: 'request' | 'folder' | 'collection'; id: string };

export function folderChain(folderId: string | null | undefined, folders: Folder[]): Folder[] {
  const chain: Folder[] = [];
  const seen = new Set<string>();
  let current = folders.find((f) => f.id === folderId);
  while (current && !seen.has(current.id)) {
    chain.push(current);
    seen.add(current.id);
    const parentId = current.parentId;
    current = folders.find((f) => f.id === parentId);
  }
  return chain;
}

export function descendantFolderIds(folderId: string, folders: Folder[]): Set<string> {
  const ids = new Set([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function folderPath(folder: Folder, folders: Folder[]): string {
  return folderChain(folder.id, folders)
    .reverse()
    .map((f) => f.name)
    .join(' / ');
}

export function treeChildren(
  collectionId: string | null,
  parentId: string | null,
  folders: Folder[],
  requests: SavedRequest[]
): TreeNode[] {
  const nodes: TreeNode[] = [
    ...folders
      .filter((f) => f.collectionId === collectionId && f.parentId === parentId)
      .map((folder): TreeNode => ({ kind: 'folder', folder })),
    ...requests
      .filter((r) => (r.collectionId ?? null) === collectionId && (r.folderId ?? null) === parentId)
      .map((request): TreeNode => ({ kind: 'request', request })),
  ];
  const position = (node: TreeNode) => (node.kind === 'folder' ? node.folder.position : node.request.position);
  return nodes.sort((a, b) => (position(a) ?? Infinity) - (position(b) ?? Infinity) || 0);
}

export function reorderTree(
  folders: Folder[],
  requests: SavedRequest[],
  node: TreeDragNode,
  target: TreeDropTarget
): { folders: Folder[]; requests: SavedRequest[] } | null {
  if (target.anchorId === node.id) return null;
  const { collectionId, parentId } = target;
  let nextFolders = folders;
  let nextRequests = requests;

  if (node.kind === 'folder') {
    const folder = folders.find((f) => f.id === node.id);
    if (!folder || folder.collectionId !== collectionId) return null;
    if (parentId && descendantFolderIds(node.id, folders).has(parentId)) return null;
    nextFolders = folders.map((f) => (f.id === node.id ? { ...f, parentId } : f));
  } else {
    if (!requests.some((r) => r.id === node.id)) return null;
    nextRequests = requests.map((r) => (r.id === node.id ? { ...r, collectionId, folderId: parentId } : r));
  }

  const nodeId = (item: TreeNode) => (item.kind === 'folder' ? item.folder.id : item.request.id);
  const siblings = treeChildren(collectionId, parentId, nextFolders, nextRequests);
  const moved = siblings.find((item) => item.kind === node.kind && nodeId(item) === node.id);
  if (!moved) return null;
  const others = siblings.filter((item) => item !== moved);
  const anchor = others.findIndex((item) => nodeId(item) === target.anchorId);
  others.splice(anchor === -1 ? others.length : anchor + Number(target.after), 0, moved);

  const positions = new Map(others.map((item, index) => [`${item.kind}:${nodeId(item)}`, index]));
  const place = <T extends { id: string; position?: number }>(kind: string, item: T): T => {
    const position = positions.get(`${kind}:${item.id}`);
    return position === undefined ? item : { ...item, position };
  };
  return {
    folders: nextFolders.map((f) => place('folder', f)),
    requests: nextRequests.map((r) => place('request', r)),
  };
}

export function requestsInTreeOrder(
  collectionId: string | null,
  parentId: string | null,
  folders: Folder[],
  requests: SavedRequest[]
): SavedRequest[] {
  return treeChildren(collectionId, parentId, folders, requests).flatMap((node) =>
    node.kind === 'request' ? [node.request] : requestsInTreeOrder(collectionId, node.folder.id, folders, requests)
  );
}

export function inheritedAuthOwner(
  request: SavedRequest,
  folders: Folder[],
  collections: Collection[]
): { owner: AuthOwner; auth: RequestAuth } | null {
  if (request.auth.type !== 'inherit') return { owner: { kind: 'request', id: request.id }, auth: request.auth };
  const folder = folderChain(request.folderId, folders).find((f) => f.auth);
  if (folder?.auth) return { owner: { kind: 'folder', id: folder.id }, auth: folder.auth };
  const collection = collections.find((c) => c.id === request.collectionId);
  return collection?.auth ? { owner: { kind: 'collection', id: collection.id }, auth: collection.auth } : null;
}

export function resolveInherited(
  request: SavedRequest,
  folders: Folder[],
  collection: Collection | undefined
): { request: SavedRequest; collection: Collection | undefined } {
  const inherited = inheritedAuthOwner(request, folders, collection ? [collection] : []);
  const auth = inherited?.auth ?? defaultAuth();
  const folderBase = folderChain(request.folderId, folders).find((f) => normalizeBaseUrl(f.baseUrl))?.baseUrl;
  return {
    request: auth === request.auth ? request : { ...request, auth },
    collection: collection && folderBase ? { ...collection, baseUrl: folderBase } : collection,
  };
}
