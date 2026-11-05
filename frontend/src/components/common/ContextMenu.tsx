import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

export interface MenuPosition {
  x: number;
  y: number;
}

const MENU_WIDTH = 210;
const MENU_HEIGHT = 280;

/** Calcula a posição do menu abaixo do elemento clicado, sem sair da janela. */
export function menuPositionFor(event: ReactMouseEvent<HTMLElement>): MenuPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
  const below = rect.bottom + 6;
  const y = below + MENU_HEIGHT > window.innerHeight ? Math.max(8, rect.top - MENU_HEIGHT - 6) : below;
  return { x, y };
}

interface ContextMenuProps {
  position: MenuPosition;
  onClose: () => void;
  children: ReactNode;
}

export function ContextMenu({ position, onClose, children }: ContextMenuProps) {
  return (
    <>
      <div className="menu-backdrop" onClick={onClose} />
      <div className="context-menu" style={{ left: position.x, top: position.y }} onClick={onClose}>
        {children}
      </div>
    </>
  );
}

interface MenuItemProps {
  onSelect: () => void;
  danger?: boolean;
  checked?: boolean;
  shortcut?: string;
  children: ReactNode;
}

export function MenuItem({ onSelect, danger, checked, shortcut, children }: MenuItemProps) {
  return (
    <button className={'menu-item' + (danger ? ' danger' : '') + (checked ? ' selected' : '')} onClick={onSelect}>
      <span className="menu-check" aria-hidden="true">{checked ? '✓' : ''}</span>
      <span className="menu-text">{children}</span>
      {shortcut && <span className="menu-shortcut">{shortcut}</span>}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="menu-label">{children}</div>;
}

export function MenuSeparator() {
  return <div className="menu-sep" />;
}
