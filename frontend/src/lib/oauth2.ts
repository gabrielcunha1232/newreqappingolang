import type { OAuth2Settings } from '../types';


const EXPIRY_MARGIN_MS = 30_000;

export type TokenPatch = Pick<OAuth2Settings, 'accessToken' | 'refreshToken' | 'expiresAt'>;

export function isTokenExpired(settings: OAuth2Settings, now = Date.now()): boolean {
  return settings.expiresAt !== null && now >= settings.expiresAt - EXPIRY_MARGIN_MS;
}

export function tokenExchangeFields(
  settings: OAuth2Settings,
  sub: (text: string) => string,
  fields: Record<string, string>
): URLSearchParams {
  const form = new URLSearchParams(fields);
  form.set('client_id', sub(settings.clientId.trim()));
  if (settings.clientSecret) form.set('client_secret', sub(settings.clientSecret));
  return form;
}

export function parseTokenResponse(
  status: number,
  body: string,
  current: OAuth2Settings,
  now = Date.now()
): TokenPatch {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body) as Record<string, unknown>;
  } catch {
    data = Object.fromEntries(new URLSearchParams(body));
  }

  const token = data.access_token;
  if (status >= 400 || typeof token !== 'string' || !token) {
    const reason = data.error_description ?? data.error;
    throw new Error(reason ? String(reason) : `O servidor de token respondeu ${status} sem access_token.`);
  }

  const expiresIn = Number(data.expires_in);
  return {
    accessToken: token,
    refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : current.refreshToken,
    expiresAt: Number.isFinite(expiresIn) && expiresIn > 0 ? now + expiresIn * 1000 : null,
  };
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function authorizationUrl(
  settings: OAuth2Settings,
  sub: (text: string) => string,
  state: string,
  challenge: string
): string {
  const url = new URL(sub(settings.authUrl.trim()));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', sub(settings.clientId.trim()));
  url.searchParams.set('redirect_uri', sub(settings.redirectUri.trim()));
  if (settings.scope.trim()) url.searchParams.set('scope', sub(settings.scope.trim()));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export function parseAuthorizationInput(input: string, expectedState: string): string {
  const text = input.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return text;

  const url = new URL(text);
  const error = url.searchParams.get('error');
  if (error) throw new Error(url.searchParams.get('error_description') ?? error);

  const state = url.searchParams.get('state');
  if (state !== null && state !== expectedState) {
    throw new Error('O "state" da URL não confere com o desta autorização. Comece de novo.');
  }
  const code = url.searchParams.get('code');
  if (!code) throw new Error('A URL colada não tem o parâmetro "code".');
  return code;
}
