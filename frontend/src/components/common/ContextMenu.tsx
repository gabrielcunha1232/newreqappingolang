import { useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface MenuPosition {
  x: number;
  y: number;
}

const MENU_WIDTH = 210;
const MENU_HEIGHT = 280;
const MARGIN = 8;

export function menuPositionFor(event: ReactMouseEvent<HTMLElement>): MenuPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.min(rect.left, window.innerWidth - MENU_WIDTH - MARGIN);
  const below = rect.bottom + 6;
  const y = below + MENU_HEIGHT > window.innerHeight ? Math.max(MARGIN, rect.top - MENU_HEIGHT - 6) : below;
  return { x, y };
}

export function menuPositionAt(event: ReactMouseEvent): MenuPosition {
  return { x: event.clientX, y: event.clientY };
}

const ITEM_SELECTOR = '.menu-item:not(:disabled)';

interface ContextMenuProps {
  position: MenuPosition;
  onClose: () => void;
  children: ReactNode;
}

export function ContextMenu({ position, onClose, children }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState(position);

  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    const x = Math.max(MARGIN, Math.min(position.x, window.innerWidth - width - MARGIN));
    const overflowsBottom = position.y + height > window.innerHeight - MARGIN;
    const y = overflowsBottom ? Math.max(MARGIN, Math.min(position.y - height, window.innerHeight - height - MARGIN)) : position.y;
    setPlaced({ x, y });
    menu.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
  }, [position]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return createPortal(
    <>
      <div
        className="menu-backdrop"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        ref={ref}
        role="menu"
        className="context-menu"
        style={{ left: placed.x, top: placed.y }}
        onClick={onClose}
        onKeyDown={onKeyDown}
        onContextMenu={(event) => event.preventDefault()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

interface MenuItemProps {
  onSelect: () => void;
  danger?: boolean;
  checked?: boolean;
  disabled?: boolean;
  shortcut?: string;
  children: ReactNode;
}

export function MenuItem({ onSelect, danger, checked, disabled, shortcut, children }: MenuItemProps) {
  return (
    <button
      role="menuitem"
      className={'menu-item' + (danger ? ' danger' : '') + (checked ? ' selected' : '')}
      disabled={disabled}
      onClick={onSelect}
    >
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
  return <div className="menu-sep" role="separator" />;
}
