import { useState } from 'react';
import type { MenuDefinition } from '../../types';
import { ContextMenu, MenuItem, MenuSeparator, type MenuPosition } from '../common/ContextMenu';

interface MenuBarProps {
  menus: MenuDefinition[];
  themeName: string;
  onOpenTheme: () => void;
}

export function MenuBar({ menus, themeName, onOpenTheme }: MenuBarProps) {
  const [open, setOpen] = useState<{ index: number; position: MenuPosition } | null>(null);

  return (
    <div className="menubar">
      {menus.map((menu, index) => (
        <span
          key={menu.label}
          role="button"
          tabIndex={0}
          className={open?.index === index ? 'open' : ''}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setOpen(open?.index === index ? null : { index, position: { x: rect.left - 6, y: rect.bottom + 2 } });
          }}
          onMouseEnter={(event) => {
            // Com um menu já aberto, passar o mouse troca de menu (como em apps desktop).
            if (open && open.index !== index) {
              const rect = event.currentTarget.getBoundingClientRect();
              setOpen({ index, position: { x: rect.left - 6, y: rect.bottom + 2 } });
            }
          }}
        >
          {menu.label}
        </span>
      ))}
      <span
        role="button"
        tabIndex={0}
        className="menubar-right"
        title="Trocar tema"
        onClick={onOpenTheme}
        onKeyDown={(event) => event.key === 'Enter' && onOpenTheme()}
      >
        Tema: <b>{themeName}</b>
      </span>

      {open && (
        <ContextMenu position={open.position} onClose={() => setOpen(null)}>
          {menus[open.index].items.map((item, i) =>
            item === 'separator' ? (
              <MenuSeparator key={i} />
            ) : (
              <MenuItem
                key={item.label}
                onSelect={item.onSelect}
                checked={item.checked}
                shortcut={item.shortcut}
                danger={item.danger}
              >
                {item.label}
              </MenuItem>
            )
          )}
        </ContextMenu>
      )}
    </div>
  );
}
