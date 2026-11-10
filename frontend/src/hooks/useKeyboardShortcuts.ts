import { useEffect, useRef } from 'react';

interface Shortcuts {
  newRequest: () => void;
  closeTab: () => void;
  globalSearch: () => void;
  help: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcuts) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F1' && !document.querySelector('[aria-modal="true"]')) {
        event.preventDefault();
        ref.current.help();
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 't') {
        event.preventDefault();
        ref.current.newRequest();
      } else if (key === 'w') {
        event.preventDefault();
        ref.current.closeTab();
      } else if (key === 'k') {
        event.preventDefault();
        ref.current.globalSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
