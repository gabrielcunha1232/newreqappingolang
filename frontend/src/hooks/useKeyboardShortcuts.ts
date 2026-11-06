import { useEffect, useRef } from 'react';

interface Shortcuts {
  newRequest: () => void;
  closeTab: () => void;
}

/** Ctrl+T abre uma nova requisição; Ctrl+W fecha a aba ativa. */
export function useKeyboardShortcuts(shortcuts: Shortcuts) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      // Com um modal aberto, os atalhos não mexem nas abas que estão por trás dele.
      if (document.querySelector('[aria-modal="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 't') {
        event.preventDefault();
        ref.current.newRequest();
      } else if (key === 'w') {
        event.preventDefault();
        ref.current.closeTab();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
