import { assert, test } from 'vitest';
import { parseBackup, serializeBackup } from '../lib/backup';
import { defaultAuth, newKeyValue, newRequest } from '../lib/factories';
import {
  DEFAULT_SECURITY,
  extractSecrets,
  injectSecrets,
  maskStoredBodies,
  sanitizeSecurity,
  stripAccessTokens,
} from '../lib/secretFields';
import { createVaultSession, isEncryptedVault, openVault, sealSecrets, verifyPassword, WrongPasswordError } from '../lib/vault';
import { deserialize, storedState, withoutSecrets, type AppSnapshot } from '../services/persistenceService';

const ITER = 1000;

function snapshot(): AppSnapshot {
  const auth = defaultAuth();
  return {
    collections: [{ id: 'c', name: 'C', collapsed: false, baseUrl: '', auth: { ...auth, type: 'bearer', token: 'col-token-123' } }],
    folders: [{ id: 'f', collectionId: 'c', parentId: null, name: 'F', collapsed: false, baseUrl: '', auth: { ...auth, type: 'basic', username: 'u', password: 'folder-pass' } }],
    requests: [
      {
        ...newRequest('c'),
        id: 'r',
        url: 'http://x/a?token=query-secret',
        headers: [newKeyValue({ id: 'h1', key: 'Authorization', value: 'Bearer header-secret' }), newKeyValue({ id: 'h2', key: 'X-Trace', value: 'visivel' })],
        params: [newKeyValue({ id: 'p1', key: 'token', value: 'query-secret' })],
        auth: {
          ...auth,
          type: 'oauth2',
          oauth2: { ...auth.oauth2, clientSecret: 'client-secret', accessToken: 'access-abc', refreshToken: 'refresh-xyz', expiresAt: 123 },
        },
      },
    ],
    openRequestIds: ['r'],
    activeRequestId: 'r',
    openDocIds: [],
    activeDocId: null,
    environments: [
      {
        id: 'e',
        name: 'Dev',
        variables: [
          newKeyValue({ id: 'v1', key: 'apiKey', value: 'env-secret-value', secret: true }),
          newKeyValue({ id: 'v2', key: 'host', value: 'localhost' }),
          newKeyValue({ id: 'v3', key: 'ref', value: '{{apiKey}}', secret: true }),
        ],
      },
    ],
    activeEnvironmentId: 'e',
    history: [{ id: 'h', requestId: 'r', method: 'GET', url: 'http://x/?k=env-secret-value', status: 200, timeSpent: 1, timestamp: '', body: '{"token":"access-abc"}' }],
    responses: { r: { status_code: 200, time_spent: 1, size: 1, body: 'env-secret-value e folder-pass', savedAt: '' } as any },
    security: DEFAULT_SECURITY,
  };
}

const SECRETS = ['col-token-123', 'folder-pass', 'header-secret', 'query-secret', 'client-secret', 'access-abc', 'refresh-xyz', 'env-secret-value'];

test('extrai e reinjeta segredos sem perdas', () => {
  const original = snapshot();
  const { state, secrets } = extractSecrets(original);
  const text = JSON.stringify({ ...state, history: [], responses: {} });
  for (const secret of SECRETS) assert.notInclude(text, secret, secret);
  assert.include(text, 'visivel');
  assert.include(text, 'localhost');
  assert.include(text, '{{apiKey}}');
  assert.strictEqual(state.folders[0].auth?.username, 'u');
  assert.deepEqual(injectSecrets(state, secrets), original);
});

test('cofre cifra, abre e recusa senha errada', async () => {
  const session = await createVaultSession('senha-forte', ITER);
  const vault = await sealSecrets(session, { a: '1', b: 'dois' });
  assert.ok(isEncryptedVault(vault));
  assert.notInclude(JSON.stringify(vault), 'dois');
  assert.deepEqual((await openVault(vault, 'senha-forte')).secrets, { a: '1', b: 'dois' });
  try {
    await openVault(vault, 'errada');
    assert.fail('deveria recusar');
  } catch (err) {
    assert.instanceOf(err, WrongPasswordError);
  }
  assert.ok(await verifyPassword(session, 'senha-forte'));
  assert.notOk(await verifyPassword(session, 'errada'));
});

test('estado salvo com senha mestra não contém segredos e volta ao original', async () => {
  const original = { ...snapshot(), security: { persistAccessTokens: true, maskStoredResponses: false } };
  const session = await createVaultSession('senha-forte', ITER);
  const stored = await storedState(original, session);
  const text = JSON.stringify({ ...stored, history: [], responses: {} });
  for (const secret of SECRETS) assert.notInclude(text, secret, secret);

  const { secrets } = await openVault(stored.vault!, 'senha-forte');
  const restored = injectSecrets(deserialize(JSON.parse(JSON.stringify(stored))), secrets);
  assert.deepEqual(restored.requests[0].auth, original.requests[0].auth);
  assert.deepEqual(restored.environments, original.environments);
  assert.deepEqual(restored.collections[0].auth, original.collections[0].auth);
  assert.strictEqual(restored.requests[0].url, original.requests[0].url);
  assert.deepEqual(restored.requests[0].params.map((p) => [p.key, p.value]), [['token', 'query-secret']]);
  assert.deepEqual(restored.requests[0].headers, original.requests[0].headers);
});

test('não salva token de acesso e mascara respostas por padrão', async () => {
  const stored = await storedState(snapshot(), null);
  assert.strictEqual(stored.requests[0].auth?.oauth2.accessToken, '');
  assert.strictEqual(stored.requests[0].auth?.oauth2.expiresAt, null);
  assert.strictEqual(stored.requests[0].auth?.oauth2.refreshToken, 'refresh-xyz');
  assert.strictEqual(stored.responses!.r.body, '{{apiKey}} e ***');
  assert.strictEqual(stored.history![0].url, 'http://x/?k={{apiKey}}');
  assert.strictEqual(stored.history![0].body, '{"token":"***"}');
  assert.strictEqual(stripAccessTokens(snapshot()).requests[0].auth.oauth2.accessToken, '');
  assert.strictEqual(maskStoredBodies({ ...snapshot(), environments: [], collections: [], folders: [], requests: [] }).history[0].body, '{"token":"access-abc"}');
});

test('backup sem segredos e configurações saneadas', () => {
  const backup = parseBackup(serializeBackup(withoutSecrets(snapshot())));
  const text = JSON.stringify(backup.state);
  for (const secret of SECRETS) assert.notInclude(text, secret, secret);
  assert.deepEqual(sanitizeSecurity({ persistAccessTokens: 'x' }), DEFAULT_SECURITY);
  assert.deepEqual(sanitizeSecurity({ persistAccessTokens: true, maskStoredResponses: false }), { persistAccessTokens: true, maskStoredResponses: false });
});
