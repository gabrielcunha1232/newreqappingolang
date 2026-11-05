import { useCallback, useMemo, useRef, useState } from 'react';
import type { DockviewApi, DockviewReadyEvent } from 'dockview';
import { applyPreset, closePanel, openPanel, type LayoutPreset } from '../lib/dockLayout';
import { isRequestPart } from '../lib/panels';
import type { PanelId, RequestPart } from '../types';

// v2: descarta layouts salvos com painéis colapsados pela v1.
// Prefixo antigo mantido de propósito para não perder o layout já salvo.
const STORAGE_KEY = 'newpostman.dock.v2';
/** Grupo menor que isso (px) é considerado colapsado/quebrado. */
const MIN_GROUP_SIZE = 30;

function hasSize(api: DockviewApi) {
  return api.width > 0 && api.height > 0;
}

function hasCollapsedGroup(api: DockviewApi) {
  return api.groups.some((g) => g.width < MIN_GROUP_SIZE || g.height < MIN_GROUP_SIZE);
}

/**
 * No Wails o webview pode ter tamanho 0 antes da janela aparecer; montar o
 * layout nesse momento deixaria todos os painéis com tamanho 0.
 */
function whenSized(api: DockviewApi, fn: () => void) {
  if (hasSize(api)) fn();
  else requestAnimationFrame(() => whenSized(api, fn));
}

function saveLayout(api: DockviewApi) {
  if (!hasSize(api) || hasCollapsedGroup(api)) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(api.toJSON()));
  } catch {
    // Armazenamento indisponível: o layout vale só para esta sessão.
  }
}

/** Restaura o layout salvo; retorna false se não houver um válido. */
function restoreLayout(api: DockviewApi): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    api.fromJSON(JSON.parse(raw));
    return api.panels.length > 0;
  } catch {
    // Layout salvo incompatível (ex.: versão anterior): descarta.
    api.clear();
    return false;
  }
}

/** Layout livre dos painéis (dockview): abrir, fechar, destacar e layouts prontos. */
export function useDockLayout() {
  const apiRef = useRef<DockviewApi | null>(null);
  const [openPanels, setOpenPanels] = useState<PanelId[]>([]);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    const { api } = event;
    apiRef.current = api;

    const sync = () => setOpenPanels(api.panels.map((p) => p.id as PanelId));

    whenSized(api, () => {
      if (!restoreLayout(api) || hasCollapsedGroup(api)) applyPreset(api, 'default');
      sync();
      api.onDidAddPanel(sync);
      api.onDidRemovePanel(sync);
      api.onDidLayoutChange(() => saveLayout(api));
    });
  }, []);

  const actions = useMemo(() => {
    const run = (fn: (api: DockviewApi) => void) => {
      if (apiRef.current) fn(apiRef.current);
    };
    return {
      toggle: (id: PanelId) => run((api) => (api.getPanel(id) ? closePanel(api, id) : openPanel(api, id))),
      detach: (part: RequestPart) => run((api) => openPanel(api, part)),
      dockBack: (part: RequestPart) => run((api) => closePanel(api, part)),
      applyPreset: (preset: LayoutPreset) => run((api) => applyPreset(api, preset)),
    };
  }, []);

  const detachedParts = useMemo(() => openPanels.filter(isRequestPart), [openPanels]);

  return { onReady, openPanels, detachedParts, actions };
}

export type DockLayout = ReturnType<typeof useDockLayout>;
