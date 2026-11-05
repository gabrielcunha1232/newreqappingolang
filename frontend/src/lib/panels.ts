import type { PanelId, RequestPart } from '../types';

export const PANEL_TITLES: Record<PanelId, string> = {
  request: 'Requisição',
  params: 'Parâmetros',
  auth: 'Autorização',
  headers: 'Cabeçalhos',
  body: 'Corpo',
  env: 'Ambiente',
  response: 'Resposta',
  console: 'Console',
};

export const PANEL_ICONS: Record<PanelId, string> = {
  request: '▤',
  params: '⋮',
  auth: '⚿',
  headers: '≡',
  body: '{ }',
  env: '♧',
  response: '▣',
  console: '›_',
};

export const MAIN_PANELS: PanelId[] = ['request', 'env', 'response', 'console'];

export const REQUEST_PARTS: RequestPart[] = ['params', 'auth', 'headers', 'body'];

export function isRequestPart(id: string): id is RequestPart {
  return (REQUEST_PARTS as string[]).includes(id);
}
