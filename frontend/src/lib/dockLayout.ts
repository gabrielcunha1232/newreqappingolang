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

function defaultPlacement(api: DockviewApi, id: PanelId): Placement {
  if (isRequestPart(id)) {
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
