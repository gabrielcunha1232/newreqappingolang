import type { CSSProperties, ReactNode } from 'react';
import type { PanelLayout } from '../../hooks/usePanelLayout';
import type { PanelId } from '../../types';

/** Altura padrão de cada linha do grid (como no protótipo). */
const DEFAULT_ROW_SIZE = ['minmax(315px, 1.05fr)', 'minmax(230px, .85fr)', '150px'];

export interface PlacedPanel {
  id: PanelId;
  row: number;
  style: CSSProperties;
}

/**
 * Distribui os painéis visíveis nas posições do grid. As posições 0 e 1
 * dividem a primeira linha; se uma delas estiver oculta, a outra ocupa a
 * linha inteira. Linhas sem painel visível somem.
 */
export function placePanels(layout: PanelLayout): { panels: PlacedPanel[]; gridStyle: CSSProperties } {
  const isVisible = (slot: number) => !layout.hidden.includes(layout.order[slot]);
  const rows: number[][] = [[0, 1], [2], [3]].map((slots) => slots.filter(isVisible));

  const panels: PlacedPanel[] = [];
  const templateRows: string[] = [];

  rows.forEach((slots, logicalRow) => {
    if (slots.length === 0) return;
    const gridRow = templateRows.length + 1;
    const height = layout.rowHeights[logicalRow];
    templateRows.push(height ? `${height}px` : DEFAULT_ROW_SIZE[logicalRow]);

    slots.forEach((slot) => {
      const gridColumn = slots.length === 2 ? String(slot + 1) : '1 / 3';
      panels.push({ id: layout.order[slot], row: logicalRow, style: { gridRow, gridColumn } });
    });
  });

  return { panels, gridStyle: { gridTemplateRows: templateRows.join(' ') } };
}

interface PanelGridProps {
  layout: PanelLayout;
  renderPanel: (placed: PlacedPanel) => ReactNode;
}

export function PanelGrid({ layout, renderPanel }: PanelGridProps) {
  const { panels, gridStyle } = placePanels(layout);
  return (
    <div className="layout" style={gridStyle}>
      {panels.map(renderPanel)}
    </div>
  );
}
