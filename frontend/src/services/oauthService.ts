import { Request } from '../../bindings/changeme/internal/models/models';
import { isTokenExpired, parseTokenResponse, tokenExchangeFields, type TokenPatch } from '../lib/oauth2';
import { interpolate } from '../lib/variables';
import type { OAuth2Settings } from '../types';
import { sendHttpRequest } from './httpService';


async function requestToken(
  settings: OAuth2Settings,
  vars: Record<string, string>,
  fields: Record<string, string>
): Promise<TokenPatch> {
  const sub = (text: string) => interpolate(text, vars);
  const url = sub(settings.tokenUrl.trim());
  if (!url) throw new Error('Informe a URL de token.');

  const response = await sendHttpRequest(
    new Request({
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: tokenExchangeFields(settings, sub, fields).toString(),
    })
  );
  return parseTokenResponse(response.status_code, response.body, settings);
}

function scopeField(settings: OAuth2Settings, vars: Record<string, string>): Record<string, string> {
  return settings.scope.trim() ? { scope: interpolate(settings.scope.trim(), vars) } : {};
}

export function fetchClientCredentialsToken(settings: OAuth2Settings, vars: Record<string, string>): Promise<TokenPatch> {
  return requestToken(settings, vars, { grant_type: 'client_credentials', ...scopeField(settings, vars) });
}

export function exchangeAuthorizationCode(
  settings: OAuth2Settings,
  vars: Record<string, string>,
  code: string,
  verifier: string
): Promise<TokenPatch> {
  return requestToken(settings, vars, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: interpolate(settings.redirectUri.trim(), vars),
    code_verifier: verifier,
  });
}

export async function renewTokenIfNeeded(
  settings: OAuth2Settings,
  vars: Record<string, string>
): Promise<TokenPatch | null> {
  const stale = !settings.accessToken || isTokenExpired(settings);
  if (!stale) return null;

  if (settings.refreshToken) {
    return requestToken(settings, vars, { grant_type: 'refresh_token', refresh_token: settings.refreshToken });
  }
  if (settings.grant === 'client_credentials' && settings.tokenUrl.trim() && settings.clientId.trim()) {
    return fetchClientCredentialsToken(settings, vars);
  }
  return null;
}
