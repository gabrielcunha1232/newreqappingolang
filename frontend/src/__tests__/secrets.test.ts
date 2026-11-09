import { assert, test } from 'vitest';
import { newKeyValue, newRequest } from '../lib/factories';
import { hideSecrets, secretEntries, shareableVariables } from '../lib/secrets';
import { interpolate, mergeVariableChanges } from '../lib/variables';
import { buildHttpRequest } from '../services/httpService';

const rows = [
  newKeyValue({ key: 'token', value: 'abc def&1', secret: true }),
  newKeyValue({ key: 'tokenLongo', value: 'abc def&1234', secret: true }),
  newKeyValue({ key: 'curta', value: '12', secret: true }),
  newKeyValue({ key: 'ref', value: '{{outra}}', secret: true }),
  newKeyValue({ key: 'host', value: 'api.local' }),
];
const secrets = secretEntries(rows);

test('só considera secretas com valor utilizável', () => {
  assert.deepEqual(secrets.map((s) => s.name), ['token', 'tokenLongo']);
});

test('troca o valor pelo nome da variável, inclusive codificado', () => {
  assert.strictEqual(hideSecrets('x abc def&1 y', secrets), 'x {{token}} y');
  assert.strictEqual(hideSecrets('?a=abc%20def%261', secrets), '?a={{token}}');
  assert.strictEqual(hideSecrets('a=abc+def%261', secrets), 'a={{token}}');
  assert.strictEqual(hideSecrets('abc def&1234', secrets), '{{tokenLongo}}');
  assert.strictEqual(hideSecrets('nada aqui', secrets), 'nada aqui');
});

test('variáveis compartilháveis mantêm a referência', () => {
  const shared = shareableVariables({ token: 'abc def&1', host: 'api.local' }, rows);
  assert.deepEqual(shared, { token: '{{token}}', host: 'api.local' });
  assert.strictEqual(interpolate('http://{{host}}/{{token}}', shared), 'http://api.local/{{token}}');
});

test('cURL e código saem sem o valor secreto', () => {
  const shared = shareableVariables({ token: 'abc def&1' }, rows);
  const built = buildHttpRequest({ ...newRequest(null), url: 'http://x/a', headers: [newKeyValue({ key: 'X-K', value: '{{token}}' })] }, undefined, shared);
  assert.ok(built.ok);
  if (built.ok) assert.strictEqual(built.request.headers['X-K'], '{{token}}');
});

test('script mantém a variável como secreta', () => {
  const [changed] = mergeVariableChanges([rows[0]], { token: 'novo valor' });
  assert.strictEqual(changed.value, 'novo valor');
  assert.strictEqual(changed.secret, true);
});
