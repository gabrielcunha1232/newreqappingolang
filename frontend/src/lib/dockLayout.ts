import type { AddPanelPositionOptions, DockviewApi } from 'dockview';
import type { PanelId } from '../types';
import { PANEL_TITLES, REQUEST_PARTS, isRequestPart } from './panels';

export type LayoutPreset = 'default' | 'side-by-side' | 'stacked';

export const PRESET_LABELS: Record<LayoutPreset, string> = {
  default: 'Padrão',
  'side-by-side': 'Lado a lado',
  stacked: 'Empilhado',
};

interface Placement {
  position?: AddPanelPositionOptions;
  initialWidth?: number;
  initialHeight?: number;
}

/** Onde cada painel aparece quando é aberto fora de um layout pronto. */
function defaultPlacement(api: DockviewApi, id: PanelId): Placement {
  if (isRequestPart(id)) {
    // Partes destacadas se juntam como abas no grupo de outra parte já destacada;
    // a primeira fica ao lado da resposta, que é a área com mais espaço.
    const sibling = REQUEST_PARTS.find((part) => part !== id && api.getPanel(part));
    if (sibling) return { position: { referencePanel: sibling, direction: 'within' } };
    return api.getPanel('response')
      ? { position: { referencePanel: 'response', direction: 'left' }, initialWidth: 460 }
      : { position: { referencePanel: 'request', direction: 'right' }, initialWidth: 460 };
  }

  switch (id) {
    case 'request':
      return { position: { direction: 'left' } };
    case 'env':
      return { position: { referencePanel: 'request', direction: 'right' }, initialWidth: 265 };
    case 'response':
      return { position: { direction: 'below' } };
    case 'console':
      return { position: { direction: 'below' }, initialHeight: 150 };
  }
}

/**
 * Abre o painel (ou só o ativa, se já estiver aberto). Se o painel de
 * referência não existir, cai para uma posição absoluta.
 */
export function openPanel(api: DockviewApi, id: PanelId, placement: Placement = defaultPlacement(api, id)) {
  const existing = api.getPanel(id);
  if (existing) {
    existing.api.setActive();
    return;
  }

  let { position } = placement;
  if (position && 'referencePanel' in position && !api.getPanel(String(position.referencePanel))) {
    position = undefined;
  }

  api.addPanel({
    id,
    component: id,
    title: PANEL_TITLES[id],
    position,
    initialWidth: placement.initialWidth,
    initialHeight: placement.initialHeight,
  });
}

export function closePanel(api: DockviewApi, id: PanelId) {
  api.getPanel(id)?.api.close();
}

/** Recria o layout do zero (as partes destacadas voltam para a requisição). */
export function applyPreset(api: DockviewApi, preset: LayoutPreset) {
  api.clear();
  openPanel(api, 'request', {});

  switch (preset) {
    case 'default':
      openPanel(api, 'env', { position: { referencePanel: 'request', direction: 'right' }, initialWidth: 265 });
      openPanel(api, 'response', { position: { direction: 'below' } });
      openPanel(api, 'console', { position: { direction: 'below' }, initialHeight: 150 });
      break;

    case 'side-by-side':
      openPanel(api, 'response', { position: { direction: 'right' } });
      openPanel(api, 'console', { position: { referencePanel: 'response', direction: 'below' }, initialHeight: 150 });
      openPanel(api, 'env', { position: { referencePanel: 'console', direction: 'within' } });
      break;

    case 'stacked':
      openPanel(api, 'response', { position: { direction: 'below' } });
      openPanel(api, 'console', { position: { direction: 'below' }, initialHeight: 150 });
      openPanel(api, 'env', { position: { referencePanel: 'console', direction: 'within' } });
      break;
  }

  api.getPanel('console')?.api.setActive();
  api.getPanel('request')?.api.setActive();
}
