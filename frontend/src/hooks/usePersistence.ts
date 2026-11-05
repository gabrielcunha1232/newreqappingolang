import { useEffect, useRef, useState } from 'react';
import { loadState, saveState, type AppSnapshot } from '../services/persistenceService';

const SAVE_DEBOUNCE_MS = 400;

/**
 * Carrega o estado salvo uma vez (via `onLoad`) e grava `snapshot` em disco,
 * com debounce, sempre que ele mudar depois da hidratação.
 */
export function usePersistence(snapshot: AppSnapshot, onLoad: (state: AppSnapshot) => void) {
  const [hydrated, setHydrated] = useState(false);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    let cancelled = false;

    loadState()
      .then((state) => {
        if (!cancelled && state) onLoadRef.current(state);
      })
      .catch(() => {
        // Sem bridge do Wails (ex.: preview no navegador): segue em memória.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      saveState(snapshot).catch(() => {
        // Falha de gravação não deve interromper o uso do app.
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [hydrated, snapshot]);

  return hydrated;
}
