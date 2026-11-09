import { assert, test } from 'vitest';
import { buildPostmanCollection, postmanFileName } from '../lib/exporters/postman';
import { importCollectionText } from '../lib/importers/index';
import { parseBackup, serializeBackup } from '../lib/backup';
import { defaultAuth, newKeyValue, newRequest } from '../lib/factories';

const auth = defaultAuth();
const collection: any = { id: 'c', name: 'Minha API', collapsed: false, baseUrl: 'https://api.x.com:8443/v1/', auth: { ...auth, type: 'bearer', token: '{{tk}}' } };
const folders: any[] = [
  { id: 'f1', collectionId: 'c', parentId: null, name: 'Users', collapsed: false, baseUrl: '', position: 0, auth: { ...auth, type: 'basic', username: 'u', password: 'lit' } },
  { id: 'f2', collectionId: 'c', parentId: 'f1', name: 'Sub', collapsed: false, baseUrl: 'http://sub.local', position: 1 },
];
const base = (over: any) => ({ ...newRequest('c'), ...over });
const requests: any[] = [
  base({ id: 'r1', folderId: 'f1', position: 2, title: 'Get', method: 'get', url: '/users/{id}?a=1&token=abc', pathValues: { id: '7' }, auth: { ...auth, type: 'inherit' },
    params: [newKeyValue({ key: 'a', value: '1' }), newKeyValue({ key: 'token', value: 'abc' }), newKeyValue({ key: 'off', value: '2', enabled: false })],
    headers: [newKeyValue({ key: 'X-A', value: 'y' }), newKeyValue({ key: 'Authorization', value: 'Bearer lit' })], postScript: 'pm.test("a", ()=>{});\n// b' }),
  base({ id: 'r2', folderId: 'f2', position: 3, title: 'Sub', method: 'POST', url: '/s', bodyType: 'form', formFields: [newKeyValue({ key: 'q', value: '1' }), newKeyValue({ key: 'password', value: 'p' })] }),
  base({ id: 'r3', position: 4, title: 'Json', method: 'POST', url: 'http://abs/x', bodyType: 'json', body: '{"password":"p","a":{"token":"{{t}}"}}', auth: { ...auth, type: 'apikey', apiKeyName: 'X-K', apiKeyValue: 'lit' } }),
  base({ id: 'r4', position: 5, title: 'Gql', method: 'POST', url: 'http://g', bodyType: 'graphql', body: 'query { a }', graphqlVariables: '{"id":1}', auth: { ...auth, type: 'none' } }),
  base({ id: 'other', collectionId: 'z', title: 'Fora' }),
];

test('exporta para Postman e reimporta sem perdas', () => {
  const { document, warnings }: any = buildPostmanCollection(collection, folders, requests);
  assert.strictEqual(document.item.length, 3);
  assert.strictEqual(document.item[0].name, 'Users');
  assert.strictEqual(document.item[0].auth.basic.find((p: any) => p.key === 'password').value, '');
  const get = document.item[0].item.find((i: any) => i.name === 'Get').request;
  assert.strictEqual(get.auth, undefined);
  assert.strictEqual(get.url.raw, 'https://api.x.com:8443/v1/users/:id?a=1&token=');
  assert.deepEqual(get.url.host, ['api', 'x', 'com']);
  assert.strictEqual(get.url.port, '8443');
  assert.deepEqual(get.url.path, ['v1', 'users', ':id']);
  assert.strictEqual(get.header[1].value, '');
  assert.ok(!JSON.stringify(document).includes('"lit"') && !JSON.stringify(document).includes('Bearer lit'));
  assert.match(warnings.join(), /em branco/);
  assert.strictEqual(postmanFileName('Minha Coleção!'), 'minha-colecao.postman_collection.json');

  const back = importCollectionText(JSON.stringify(document), []);
  assert.strictEqual(back.collection.name, 'Minha API');
  assert.strictEqual(back.collection.auth?.token, '{{tk}}');
  assert.strictEqual(back.folders.length, 2);
  assert.strictEqual(back.folders[1].parentId, back.folders[0].id);
  assert.deepEqual(back.requests.map((r) => r.title), ['Sub', 'Get', 'Json', 'Gql']);
  const [sub, g, json, gql] = back.requests;
  assert.strictEqual(sub.url, 'http://sub.local/s');
  assert.strictEqual(sub.bodyType, 'form');
  assert.strictEqual(sub.formFields![1].value, '');
  assert.strictEqual(g.auth.type, 'inherit');
  assert.deepEqual(g.pathValues, { id: '7' });
  assert.deepEqual(g.params.map((p) => [p.key, p.enabled]), [['a', true], ['token', true], ['off', false]]);
  assert.match(g.postScript, /\/\/ b/);
  assert.strictEqual(json.bodyType, 'json');
  assert.deepEqual(JSON.parse(json.body), { password: '', a: { token: '{{t}}' } });
  assert.strictEqual(json.auth.type, 'apikey');
  assert.strictEqual(json.auth.apiKeyValue, '');
  assert.strictEqual(gql.bodyType, 'graphql');
  assert.strictEqual(gql.graphqlVariables, '{"id":1}');
  assert.strictEqual(gql.auth.type, 'none');
  assert.deepEqual(back.warnings, []);

  const rel: any = buildPostmanCollection({ ...collection, baseUrl: '', auth: undefined }, [], [base({ title: 'R', url: '/a/*rest' })]);
  assert.strictEqual(rel.document.item[0].request.url.raw, '{{baseUrl}}/a/:rest');
  assert.deepEqual(rel.document.item[0].request.url.host, ['{{baseUrl}}']);
  assert.match(rel.warnings.join(), /URL base/);
});

test('serializa e valida backup', () => {
  const state: any = { collections: [collection], folders, requests, environments: [{ id: 'e', name: 'E', variables: [] }], history: [] };
  const parsed = parseBackup(serializeBackup(state, new Date('2026-01-02T00:00:00Z')));
  assert.strictEqual(parsed.exportedAt, '2026-01-02T00:00:00.000Z');
  assert.deepEqual(parsed.state, JSON.parse(JSON.stringify(state)));
  assert.throws(() => parseBackup('nope'), /JSON válido/);
  assert.throws(() => parseBackup('{"info":{}}'), /não é um backup/);
  assert.throws(() => parseBackup('{"format":"forkarsenet-backup","version":99,"state":{}}'), /mais nova/);
  assert.throws(() => parseBackup('{"format":"forkarsenet-backup","version":1,"state":{"requests":[{}],"collections":[]}}'), /corrompido/);
  assert.throws(() => parseBackup('{"format":"forkarsenet-backup","version":1,"state":{"requests":[]}}'), /corrompido/);
});
