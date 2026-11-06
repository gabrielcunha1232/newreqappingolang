import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { menuPositionAt, menuPositionFor, type MenuPosition } from '../components/common/ContextMenu';

export interface OpenContextMenu<T> {
  target: T;
  position: MenuPosition;
}

/**
 * Estado de um menu de contexto: sobre qual item ele foi aberto e onde.
 * `openAt` é para o clique direito (no cursor); `openBelow`, para botões ⋯.
 */
export function useContextMenu<T>() {
  const [menu, setMenu] = useState<OpenContextMenu<T> | null>(null);

  const openAt = useCallback((event: ReactMouseEvent, target: T) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ target, position: menuPositionAt(event) });
  }, []);

  const openBelow = useCallback((event: ReactMouseEvent<HTMLElement>, target: T) => {
    event.stopPropagation();
    setMenu({ target, position: menuPositionFor(event) });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  return { menu, openAt, openBelow, close };
}
