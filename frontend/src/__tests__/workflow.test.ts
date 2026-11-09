import { assert, test } from 'vitest';
import { applyExtractions, flattenJson, readPath } from '../lib/extractions';
import { newRequest } from '../lib/factories';
import { filterHistory, groupHistoryByDay, statusGroup } from '../lib/historyView';
import { MAX_STORED_RESPONSE, capHistoryBodies, storedResponses } from '../lib/responseStore';
import { schemaFields, setAllRequired, setRequired } from '../lib/schemaEditor';
import { responseSchemaIssues, withEditedSchema } from '../lib/schemaValidation';
import { reorderTree, treeChildren } from '../lib/tree';
import type { Folder, HistoryEntry, RequestRuntime } from '../types';

const data = { data: { token: 'T', items: [{ id: 7 }, { id: 8 }] }, 'a-b': true, nada: null, n: 0 };

test('achata o JSON e lê caminhos', () => {
  const leaves = flattenJson(data);
  assert.deepEqual(leaves.map((leaf) => leaf.path), ['data.token', 'data.items[0].id', 'data.items[1].id', '["a-b"]', 'nada', 'n']);
  assert.strictEqual(leaves[1].variable, 'id');
  assert.strictEqual(leaves[3].variable, 'a-b');
  assert.strictEqual(flattenJson(data, 2).length, 2);
  assert.strictEqual(readPath(data, 'data.items[1].id'), 8);
  assert.strictEqual(readPath(data, '["a-b"]'), true);
  assert.strictEqual(readPath(data, 'data.x.y'), undefined);
  assert.strictEqual(readPath(data, 'data..x'), undefined);
});

test('aplica extrações e aponta o que faltou', () => {
  const rules = [
    { id: '1', path: 'data.token', variable: 'token' },
    { id: '2', path: 'n', variable: 'zero' },
    { id: '3', path: 'data.items', variable: 'lista' },
    { id: '4', path: 'nada', variable: 'nulo' },
    { id: '5', path: 'x', variable: 'x' },
  ];
  assert.deepEqual(applyExtractions(rules, JSON.stringify(data)), {
    changes: { token: 'T', zero: '0', lista: '[{"id":7},{"id":8}]' },
    missing: ['nada', 'x'],
  });
  assert.deepEqual(applyExtractions(rules.slice(0, 1), 'texto'), { changes: {}, missing: ['data.token'] });
});

const IDLE: RequestRuntime = { response: null, previous: null, error: '', loading: false, tests: null, scriptError: '' };
const run = (body: string, at: string): RequestRuntime => ({ ...IDLE, response: { status_code: 200, time_spent: 1, size: body.length, body }, receivedAt: at });

test('guarda só respostas dentro dos limites, priorizando as recentes', () => {
  const runtime = { velha: run('aaaa', '2026-01-01'), nova: run('bbbb', '2026-01-03'), grande: run('x'.repeat(MAX_STORED_RESPONSE + 1), '2026-01-04'), vazia: IDLE };
  assert.deepEqual(Object.keys(storedResponses(runtime)).sort(), ['nova', 'velha']);
  assert.deepEqual(Object.keys(storedResponses(runtime, 5)), ['nova']);
  assert.strictEqual(storedResponses(runtime).nova.savedAt, '2026-01-03');
});

const entry = (id: string, method: string, status: number, timestamp: string, body?: string): HistoryEntry => ({
  id, requestId: null, method, url: `http://x/${id}`, status, timeSpent: 1, timestamp, body,
});

test('filtra, agrupa e limita o histórico', () => {
  const now = new Date(2026, 10, 9, 12);
  const list = [
    entry('a', 'GET', 200, new Date(2026, 10, 9, 8).toISOString(), 'aaaa'),
    entry('b', 'POST', 404, new Date(2026, 10, 8, 23).toISOString(), 'bbbb'),
    entry('c', 'GET', 503, new Date(2026, 10, 1, 8).toISOString()),
  ];
  assert.strictEqual(statusGroup(404), '4xx');
  assert.deepEqual(filterHistory(list, { term: '', method: 'GET', status: '5xx' }).map((e) => e.id), ['c']);
  assert.deepEqual(filterHistory(list, { term: 'X/B', method: '', status: '' }).map((e) => e.id), ['b']);
  assert.deepEqual(groupHistoryByDay(list, now).map((g) => g.label), ['Hoje', 'Ontem', '01/11/2026']);
  const capped = capHistoryBodies(list, 5);
  assert.strictEqual(capped[0].body, 'aaaa');
  assert.strictEqual(capped[1].body, undefined);
});

const schema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    items: { type: 'array', items: { type: 'object', properties: { sku: { type: 'string' } } } },
  },
};

test('edita campos obrigatórios e valida respostas', () => {
  assert.deepEqual(schemaFields(schema).map((f) => [f.path, f.depth, f.type]), [['id', 0, 'integer'], ['items', 0, 'array'], ['items[].sku', 1, 'string']]);
  const sku = schemaFields(schema)[2];
  const marked = setRequired(schema, sku.parent, sku.name, true) as any;
  assert.deepEqual(marked.properties.items.items.required, ['sku']);
  assert.strictEqual(schemaFields(marked)[2].required, true);
  assert.strictEqual('required' in (setRequired(marked, sku.parent, sku.name, false) as any).properties.items.items, false);
  assert.deepEqual((setAllRequired(schema, true) as any).required, ['id', 'items']);

  const doc = withEditedSchema({ responses: [{ status: '200', schema, schemaInferred: true }] }, '200', setAllRequired(schema, true));
  assert.strictEqual(doc.responses![0].schemaInferred, undefined);
  assert.deepEqual(responseSchemaIssues(doc, 200, '{"id":1}').map((i) => i.path), ['$.items']);
  assert.deepEqual(responseSchemaIssues(doc, 200, 'x').map((i) => i.path), ['$']);
  assert.deepEqual(responseSchemaIssues(doc, 201, 'x'), []);
  assert.deepEqual(responseSchemaIssues(doc, null, 'x'), []);
});

const folder = (id: string, parentId: string | null, position: number, collectionId = 'c'): Folder => ({ id, collectionId, parentId, name: id, collapsed: false, baseUrl: '', position });
const request = (id: string, folderId: string | null, position: number, collectionId: string | null = 'c') => ({ ...newRequest(collectionId), id, folderId, position });
const folders = [folder('a', null, 0), folder('b', 'a', 0), folder('z', null, 1, 'outra')];
const requests = [request('r1', null, 1), request('r2', null, 2), request('r3', 'a', 1)];
const order = (result: NonNullable<ReturnType<typeof reorderTree>>, collectionId: string | null, parentId: string | null) =>
  treeChildren(collectionId, parentId, result.folders, result.requests).map((node) => (node.kind === 'folder' ? node.folder.id : node.request.id));

test('reordena e move itens na árvore', () => {
  const up = reorderTree(folders, requests, { kind: 'request', id: 'r2' }, { collectionId: 'c', parentId: null, anchorId: 'a', after: false })!;
  assert.deepEqual(order(up, 'c', null), ['r2', 'a', 'r1']);

  const down = reorderTree(folders, requests, { kind: 'folder', id: 'a' }, { collectionId: 'c', parentId: null, anchorId: 'r2', after: true })!;
  assert.deepEqual(order(down, 'c', null), ['r1', 'r2', 'a']);

  const into = reorderTree(folders, requests, { kind: 'request', id: 'r1' }, { collectionId: 'c', parentId: 'b', anchorId: null, after: false })!;
  assert.deepEqual(order(into, 'c', 'b'), ['r1']);
  assert.deepEqual(order(into, 'c', null), ['a', 'r2']);

  const other = reorderTree(folders, requests, { kind: 'request', id: 'r3' }, { collectionId: 'outra', parentId: 'z', anchorId: null, after: false })!;
  assert.strictEqual(other.requests.find((r) => r.id === 'r3')!.collectionId, 'outra');

  const ungrouped = reorderTree(folders, requests, { kind: 'request', id: 'r1' }, { collectionId: null, parentId: null, anchorId: null, after: false })!;
  assert.deepEqual(order(ungrouped, null, null), ['r1']);
});

test('recusa movimentos inválidos', () => {
  assert.strictEqual(reorderTree(folders, requests, { kind: 'folder', id: 'a' }, { collectionId: 'c', parentId: 'b', anchorId: null, after: false }), null);
  assert.strictEqual(reorderTree(folders, requests, { kind: 'folder', id: 'a' }, { collectionId: 'c', parentId: 'a', anchorId: null, after: false }), null);
  assert.strictEqual(reorderTree(folders, requests, { kind: 'folder', id: 'a' }, { collectionId: 'outra', parentId: null, anchorId: null, after: false }), null);
  assert.strictEqual(reorderTree(folders, requests, { kind: 'request', id: 'r1' }, { collectionId: 'c', parentId: null, anchorId: 'r1', after: true }), null);
});
