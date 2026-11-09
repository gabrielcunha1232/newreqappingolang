import type { Endpoint } from '../../bindings/changeme/internal/models/models';
import type { Environment, KeyValue, OAuth2Settings, RequestAuth, SavedRequest } from '../types';
import { sourceFromScan } from './endpointSource';
import { generateId } from './id';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function newKeyValue(partial: Partial<KeyValue> = {}): KeyValue {
  return { id: generateId(), enabled: true, key: '', value: '', description: '', ...partial };
}

export function defaultOAuth2(): OAuth2Settings {
  return {
    grant: 'client_credentials',
    tokenUrl: '',
    authUrl: '',
    redirectUri: 'http://localhost/callback',
    clientId: '',
    clientSecret: '',
    scope: '',
    accessToken: '',
    refreshToken: '',
    expiresAt: null,
  };
}

export function defaultAuth(): RequestAuth {
  return {
    type: 'none',
    token: '',
    username: '',
    password: '',
    apiKeyName: 'X-API-Key',
    apiKeyValue: '',
    oauth2: defaultOAuth2(),
  };
}

export function newRequest(collectionId: string | null = null): SavedRequest {
  return {
    id: generateId(),
    collectionId,
    title: 'Nova requisição',
    method: 'GET',
    url: 'https://httpbin.org/get',
    params: [],
    pathValues: {},
    headers: [newKeyValue({ key: 'Accept', value: 'application/json' })],
    auth: defaultAuth(),
    bodyType: 'json',
    body: '',
    preScript: '',
    postScript: '',
  };
}

export function requestFromEndpoint(endpoint: Endpoint, collectionId: string | null): SavedRequest {
  return {
    ...newRequest(collectionId),
    method: endpoint.method,
    url: endpoint.path,
    title: `${endpoint.method} ${endpoint.path}`,
    source: sourceFromScan(endpoint),
  };
}

export function defaultEnvironments(): Environment[] {
  return [{ id: generateId(), name: 'Desenvolvimento', variables: [] }];
}
