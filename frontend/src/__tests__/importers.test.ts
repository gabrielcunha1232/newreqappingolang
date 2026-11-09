import { assert, test } from 'vitest';
import { importCollectionText } from '../lib/importers/index';

test('importa Postman', () => {
  const postman = {
    info: { name: 'Loja', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{tk}}' }] },
    variable: [{ key: 'base', value: 'http://x' }],
    item: [
      { name: 'Pasta', item: [
        { name: 'Get', event: [{ listen: 'test', script: { exec: ['pm.test("a", ()=>{});', '// b'] } }],
          request: { method: 'get', url: { raw: '{{base}}/u/:id?a=1', query: [{ key: 'a', value: '1' }, { key: 'off', value: '2', disabled: true }], variable: [{ key: 'id', value: '7' }] }, header: [{ key: 'X', value: 'y', disabled: true }] } },
        { name: 'NoAuth', request: { method: 'POST', url: 'http://x/n', auth: { type: 'noauth' }, body: { mode: 'raw', raw: '{"a":1}', options: { raw: { language: 'json' } } } } },
      ] },
      { name: 'Form', request: { method: 'POST', url: 'http://x/f', auth: { type: 'apikey', apikey: [{ key: 'key', value: 'K' }, { key: 'value', value: 'V' }, { key: 'in', value: 'query' }] }, body: { mode: 'urlencoded', urlencoded: [{ key: 'q', value: '1' }] } } },
      { name: 'Gql', request: { method: 'POST', url: 'http://x/g', body: { mode: 'graphql', graphql: { query: '{a}', variables: '{"b":1}' } } } },
      { name: 'Multi', request: { method: 'POST', url: 'http://x/m', auth: { type: 'digest', digest: [] }, body: { mode: 'formdata', formdata: [] } } },
    ],
  };
  const p = importCollectionText(JSON.stringify(postman), ['Loja']);
  assert.strictEqual(p.collection.name, 'Loja (2)');
  assert.strictEqual(p.requests.length, 5);
  const [get, noauth, f, g, m] = p.requests;
  assert.strictEqual(get.title, 'Get'); assert.strictEqual(get.folderId, p.folders[0].id);
  assert.strictEqual(get.method, 'GET');
  assert.strictEqual(get.auth.type, 'inherit');
  assert.strictEqual(p.collection.auth?.token, '{{tk}}');
  assert.deepEqual(get.pathValues, { id: '7' });
  assert.deepEqual(get.params.map((r) => [r.key, r.enabled]), [['a', true], ['off', false]]);
  assert.strictEqual(get.headers[0].enabled, false);
  assert.match(get.postScript, /pm\.test/);
  assert.strictEqual(noauth.auth.type, 'none');
  assert.strictEqual(noauth.bodyType, 'json');
  assert.strictEqual(f.bodyType, 'form');
  assert.strictEqual(f.url, 'http://x/f?K=V');
  assert.deepEqual(f.params.map((r) => r.key), ['K']);
  assert.strictEqual(g.bodyType, 'graphql');
  assert.strictEqual(g.graphqlVariables, '{"b":1}');
  assert.strictEqual(m.auth.type, 'none');
  assert.strictEqual(p.warnings.length, 2, p.warnings.join('|'));
  assert.strictEqual(p.environment?.variables[0].key, 'base');

  const v20 = { collection: { info: { name: 'V', schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json' }, item: [{ name: 'B', request: { method: 'GET', url: 'http://x', auth: { type: 'basic', basic: { username: 'u', password: 'p' } } } }] } };
  assert.strictEqual(importCollectionText(JSON.stringify(v20), []).requests[0].auth.username, 'u');
});

test('importa Insomnia', () => {
  const insomnia = {
    _type: 'export', __export_format: 4,
    resources: [
      { _id: 'w', _type: 'workspace', name: 'Ins' },
      { _id: 'env', _type: 'environment', parentId: 'w', data: { host: 'http://b', nested: { a: 1 } } },
      { _id: 'env2', _type: 'environment', parentId: 'env', name: 'prod', data: { host: 'http://p' } },
      { _id: 'g', _type: 'request_group', parentId: 'w', name: 'Grp', metaSortKey: 2 },
      { _id: 'r2', _type: 'request', parentId: 'w', name: 'Zero', metaSortKey: 1, method: 'POST', url: '{{ _.host }}/z', parameters: [{ name: 'a', value: '1' }, { name: 'b', value: '2', disabled: true }], headers: [{ name: 'H', value: '{{ _.nested.a }}' }], authentication: { type: 'bearer', token: '{{ _.tk }}' }, body: { mimeType: 'application/json', text: '{"h":"{{ _.host }}"}' } },
      { _id: 'r1', _type: 'request', parentId: 'g', name: 'Inner', method: 'POST', url: 'http://i', body: { mimeType: 'application/graphql', text: '{"query":"{a}","variables":{"b":1}}' } },
      { _id: 'r3', _type: 'request', parentId: 'g', name: 'F', metaSortKey: 9, method: 'POST', url: 'http://f', body: { mimeType: 'application/x-www-form-urlencoded', params: [{ name: 'q', value: '{{ _.host }}' }] } },
      { _id: 'x', _type: 'websocket_request', parentId: 'w' },
    ],
  };
  const i = importCollectionText(JSON.stringify(insomnia), []);
  assert.deepEqual(i.requests.map((r) => r.title), ['Zero', 'Inner', 'F']);
  const z = i.requests[0];
  assert.strictEqual(z.url, '{{host}}/z?a=1');
  assert.deepEqual(z.params.map((r) => [r.key, r.enabled]), [['a', true], ['b', false]]);
  assert.strictEqual(z.headers[0].value, '{{nested.a}}');
  assert.strictEqual(z.auth.token, '{{tk}}');
  assert.strictEqual(z.body, '{"h":"{{host}}"}');
  assert.strictEqual(i.requests[1].bodyType, 'graphql');
  assert.strictEqual(i.requests[1].graphqlVariables, '{\n  "b": 1\n}');
  assert.strictEqual(i.requests[2].formFields?.[0].value, '{{host}}');
  assert.deepEqual(Object.fromEntries(i.environment!.variables.map((v) => [v.key, v.value])), { host: 'http://p', 'nested.a': '1' });
  assert.strictEqual(i.warnings.length, 1, i.warnings.join('|'));
});

test('rejeita conteúdo inválido', () => {
  assert.throws(() => importCollectionText('{}', []), /não reconhecido/);
  assert.throws(() => importCollectionText('nope', []), /JSON válido/);
  assert.throws(() => importCollectionText(JSON.stringify({ _type: 'export', __export_format: 3, resources: [] }), []), /formato 4/);
});
