import { useCallback, useEffect, useState } from 'react';
import type { PanelId } from '../types';

const STORAGE_KEY = 'newpostman.layout';

/** Posições do grid: 0 e 1 dividem a linha de cima; 2 e 3 ocupam a largura toda. */
export const SLOT_COUNT = 4;

export interface PanelLayout {
  /** order[slot] = painel que ocupa aquela posição. */
  order: PanelId[];
  hidden: PanelId[];
  /** Altura (px) definida pelo usuário para cada linha do grid. */
  rowHeights: Record<number, number>;
}

const DEFAULT_LAYOUT: PanelLayout = {
  order: ['request', 'env', 'response', 'console'],
  hidden: [],
  rowHeights: {},
};

function readStored(): PanelLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as PanelLayout;
    const valid =
      Array.isArray(parsed.order) &&
      parsed.order.length === SLOT_COUNT &&
      DEFAULT_LAYOUT.order.every((id) => parsed.order.includes(id));
    return valid ? { ...DEFAULT_LAYOUT, ...parsed } : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

/** Ordem, visibilidade e tamanho dos painéis do workspace (lembrado por máquina). */
export function usePanelLayout() {
  const [layout, setLayout] = useState<PanelLayout>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Armazenamento indisponível: o layout vale só para esta sessão.
    }
  }, [layout]);

  const swap = useCallback((a: PanelId, b: PanelId) => {
    setLayout((prev) => {
      const order = [...prev.order];
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      [order[ia], order[ib]] = [order[ib], order[ia]];
      return { ...prev, order };
    });
  }, []);

  const setVisible = useCallback((id: PanelId, visible: boolean) => {
    setLayout((prev) => ({
      ...prev,
      hidden: visible ? prev.hidden.filter((x) => x !== id) : [...new Set([...prev.hidden, id])],
    }));
  }, []);

  const setRowHeight = useCallback((row: number, height: number) => {
    setLayout((prev) => ({ ...prev, rowHeights: { ...prev.rowHeights, [row]: height } }));
  }, []);

  const reset = useCallback(() => setLayout(DEFAULT_LAYOUT), []);

  return { layout, actions: { swap, setVisible, setRowHeight, reset } };
}

export type PanelLayoutActions = ReturnType<typeof usePanelLayout>['actions'];
