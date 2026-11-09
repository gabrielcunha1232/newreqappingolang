import { assert, test } from 'vitest';
import { authorizationUrl, isTokenExpired, parseAuthorizationInput, parseTokenResponse, pkceChallenge } from '../lib/oauth2';
import { defaultOAuth2 } from '../lib/factories';

const id = (t: string) => t;

test('monta URL, lê tokens e calcula PKCE', async () => {
  const o = { ...defaultOAuth2(), authUrl: 'https://i/a?x=1', clientId: 'c', scope: 's t', redirectUri: 'http://l/cb' };
  const u = new URL(authorizationUrl(o, id, 'st', 'ch'));
  assert.strictEqual(u.searchParams.get('x'), '1');
  assert.strictEqual(u.searchParams.get('code_challenge_method'), 'S256');
  assert.strictEqual(u.searchParams.get('scope'), 's t');
  assert.strictEqual(parseAuthorizationInput('abc', 'st'), 'abc');
  assert.strictEqual(parseAuthorizationInput('http://l/cb?code=z&state=st', 'st'), 'z');
  assert.throws(() => parseAuthorizationInput('http://l/cb?code=z&state=bad', 'st'), /state/);
  assert.throws(() => parseAuthorizationInput('http://l/cb?error=access_denied', 'st'), /access_denied/);
  const t = parseTokenResponse(200, '{"access_token":"T","expires_in":60}', { ...o, refreshToken: 'R' }, 1000);
  assert.deepEqual(t, { accessToken: 'T', refreshToken: 'R', expiresAt: 61000 });
  assert.strictEqual(parseTokenResponse(200, 'access_token=F&token_type=bearer', o).accessToken, 'F');
  assert.throws(() => parseTokenResponse(400, '{"error":"invalid_client"}', o), /invalid_client/);
  assert.strictEqual(isTokenExpired({ ...o, expiresAt: 100_000 }, 80_000), true);
  assert.strictEqual(isTokenExpired({ ...o, expiresAt: 100_000 }, 10_000), false);
  assert.strictEqual(isTokenExpired({ ...o, expiresAt: null }, 10_000), false);
  assert.strictEqual(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
