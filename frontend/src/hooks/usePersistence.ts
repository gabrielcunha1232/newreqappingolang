import { useCallback, useEffect, useRef, useState } from 'react';
import { injectSecrets } from '../lib/secretFields';
import { isEncryptedVault, openVault, type EncryptedVault, type VaultSession } from '../lib/vault';
import { deserialize, loadRawState, saveState, type AppSnapshot } from '../services/persistenceService';
import type { PersistedState } from '../types';

const SAVE_DEBOUNCE_MS = 400;

interface LockedState {
  state: Partial<PersistedState>;
  vault: EncryptedVault;
}

export function usePersistence(
  snapshot: AppSnapshot,
  session: VaultSession | null,
  onLoad: (state: AppSnapshot) => void,
  onUnlock: (session: VaultSession) => void
) {
  const [hydrated, setHydrated] = useState(false);
  const [locked, setLocked] = useState<LockedState | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  useEffect(() => {
    let cancelled = false;

    loadRawState()
      .then((raw) => {
        if (cancelled) return;
        if (raw && isEncryptedVault(raw.vault)) {
          setLocked({ state: raw, vault: raw.vault });
          return;
        }
        if (raw) onLoadRef.current(deserialize(raw));
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      if (!locked) return;
      const { secrets, session: opened } = await openVault(locked.vault, password);
      onLoadRef.current(injectSecrets(deserialize(locked.state), secrets));
      onUnlockRef.current(opened);
      setLocked(null);
      setHydrated(true);
    },
    [locked]
  );

  const discardSecrets = useCallback(() => {
    if (!locked) return;
    onLoadRef.current(deserialize(locked.state));
    setLocked(null);
    setHydrated(true);
  }, [locked]);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      saveState(snapshot, session).catch(() => {
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [hydrated, snapshot, session]);

  return { hydrated, locked: locked !== null, unlock, discardSecrets };
}
