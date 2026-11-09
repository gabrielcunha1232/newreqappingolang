import { assert, test } from 'vitest';
import { importCollectionText } from '../lib/importers/index';
import { defaultAuth, newRequest } from '../lib/factories';
import { descendantFolderIds, requestsInTreeOrder, resolveInherited, treeChildren } from '../lib/tree';
import { initialWorkspace, workspaceReducer as R } from '../state/workspaceReducer';
import type { Collection, Folder, RequestAuth } from '../types';
import type { WorkspaceState } from '../state/workspaceReducer';

const bearer = (token: string): RequestAuth => ({ ...defaultAuth(), type: 'bearer', token });
const inherit: RequestAuth = { ...defaultAuth(), type: 'inherit' };
const col: Collection = { id: 'c', name: 'C', collapsed: false, baseUrl: 'http://col', auth: bearer('COL') };
const f = (id: string, parentId: string | null, extra: Partial<Folder> = {}): Folder => ({ id, collectionId: 'c', parentId, name: id, collapsed: false, baseUrl: '', ...extra });
const folders = [f('a', null, { auth: bearer('A'), baseUrl: 'http://a' }), f('b', 'a'), f('d', null)];
const req = (folderId: string | null, auth = inherit) => ({ ...newRequest('c'), folderId, auth });

test('resolve herança de autenticação e URL base', () => {
  let r = resolveInherited(req('b'), folders, col);
  assert.strictEqual(r.request.auth.token, 'A');
  assert.strictEqual(r.collection?.baseUrl, 'http://a');
  r = resolveInherited(req('d'), folders, col);
  assert.strictEqual(r.request.auth.token, 'COL');
  assert.strictEqual(r.collection?.baseUrl, 'http://col');
  assert.strictEqual(resolveInherited(req(null, bearer('O')), folders, col).request.auth.token, 'O');
  assert.strictEqual(resolveInherited({ ...newRequest(null), auth: inherit }, [], undefined).request.auth.type, 'none');
  const stop = [f('a', null, { auth: { ...defaultAuth(), type: 'none' } })];
  assert.strictEqual(resolveInherited(req('a'), stop, col).request.auth.type, 'none');

  assert.deepEqual([...descendantFolderIds('a', folders)].sort(), ['a', 'b']);
  const cyc = [f('x', 'y'), f('y', 'x')];
  assert.strictEqual(resolveInherited(req('x'), cyc, col).request.auth.token, 'COL');
});

test('reducer de pastas', () => {
  let s: WorkspaceState = { ...initialWorkspace(), collections: [col], folders, requests: [{ ...req('b'), id: 'r1', auth: inherit }, { ...req('a', bearer('own')), id: 'r2' }] };
  s = R(s, { type: 'request/auth-renewed', id: 'r1', auth: bearer('NEW') });
  assert.strictEqual(s.folders[0].auth?.token, 'NEW');
  assert.strictEqual(s.requests[0].auth.type, 'inherit');
  s = R(s, { type: 'request/auth-renewed', id: 'r2', auth: bearer('NEW2') });
  assert.strictEqual(s.requests[1].auth.token, 'NEW2');

  assert.strictEqual(R(s, { type: 'folder/move', id: 'a', parentId: 'b' }), s);
  const moved = R(s, { type: 'folder/move', id: 'd', parentId: 'b' });
  assert.strictEqual(moved.folders[2].parentId, 'b');
  const del = R(s, { type: 'folder/delete', id: 'a' });
  assert.strictEqual(del.folders.find((x) => x.id === 'b')?.parentId, null);
  assert.strictEqual(del.requests[1].folderId, null);
  assert.strictEqual(del.requests[0].folderId, 'b');
  const delC = R(s, { type: 'collection/delete', id: 'c' });
  assert.strictEqual(delC.folders.length, 0);
  assert.deepEqual([delC.requests[0].collectionId, delC.requests[0].folderId], [null, null]);
});

test('Postman mantém pastas e herança', () => {
  const postman = {
    info: { name: 'P', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: 'T' }] },
    item: [
      { name: 'login', request: { method: 'POST', url: 'http://x/login' } },
      { name: 'F1', auth: { type: 'basic', basic: [{ key: 'username', value: 'u' }] }, item: [
        { name: 'in', request: { method: 'GET', url: 'http://x/in' } },
        { name: 'Sub', auth: { type: 'noauth' }, item: [{ name: 'deep', request: { method: 'GET', url: 'http://x/d' } }] },
      ] },
      { name: 'last', request: { method: 'GET', url: 'http://x/l', auth: { type: 'noauth' } } },
      { name: 'K', auth: { type: 'apikey', apikey: [{ key: 'key', value: 'k' }, { key: 'value', value: 'v' }, { key: 'in', value: 'query' }] }, item: [{ name: 'q', request: { method: 'GET', url: 'http://x/q' } }] },
    ],
  };
  const p = importCollectionText(JSON.stringify(postman), []);
  assert.strictEqual(p.collection.auth?.token, 'T');
  assert.deepEqual(p.folders.map((x) => x.name), ['F1', 'Sub', 'K']);
  assert.strictEqual(p.folders[1].parentId, p.folders[0].id);
  const order = requestsInTreeOrder(p.collection.id, null, p.folders, p.requests).map((x) => x.title);
  assert.deepEqual(order, ['login', 'in', 'deep', 'last', 'q']);
  assert.deepEqual(treeChildren(p.collection.id, null, p.folders, p.requests).map((n) => n.kind), ['request', 'folder', 'request', 'folder']);
  const byTitle = (t: string) => p.requests.find((x) => x.title === t)!;
  assert.strictEqual(resolveInherited(byTitle('login'), p.folders, p.collection).request.auth.token, 'T');
  assert.strictEqual(resolveInherited(byTitle('in'), p.folders, p.collection).request.auth.type, 'basic');
  assert.strictEqual(resolveInherited(byTitle('deep'), p.folders, p.collection).request.auth.type, 'none');
  assert.strictEqual(byTitle('last').auth.type, 'none');
  assert.strictEqual(byTitle('q').url, 'http://x/q?k=v');
});

test('Insomnia mantém pastas e herança', () => {
  const ins = importCollectionText(JSON.stringify({ _type: 'export', __export_format: 4, resources: [
    { _id: 'w', _type: 'workspace', name: 'I' },
    { _id: 'g', _type: 'request_group', parentId: 'w', name: 'G', metaSortKey: 2, authentication: { type: 'bearer', token: 'GT' } },
    { _id: 'r', _type: 'request', parentId: 'g', name: 'in', method: 'GET', url: 'http://i', authentication: {} },
    { _id: 'r0', _type: 'request', parentId: 'w', name: 'first', metaSortKey: 1, method: 'GET', url: 'http://f', authentication: {} },
  ] }), []);
  assert.deepEqual(requestsInTreeOrder(ins.collection.id, null, ins.folders, ins.requests).map((x) => x.title), ['first', 'in']);
  assert.strictEqual(ins.requests.find((x) => x.title === 'first')!.auth.type, 'none');
  assert.strictEqual(resolveInherited(ins.requests.find((x) => x.title === 'in')!, ins.folders, ins.collection).request.auth.token, 'GT');
});
