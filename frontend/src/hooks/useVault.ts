import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_SECURITY, type SecuritySettings } from '../lib/secretFields';
import { createVaultSession, verifyPassword, WrongPasswordError, type VaultSession } from '../lib/vault';

export const MIN_PASSWORD_LENGTH = 8;

function assertStrong(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`A senha mestra precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
}

export function useVault() {
  const [session, setSession] = useState<VaultSession | null>(null);
  const [settings, setSettingsState] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [dialogOpen, setDialogOpen] = useState(false);

  const enable = useCallback(async (password: string) => {
    assertStrong(password);
    setSession(await createVaultSession(password));
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!session) throw new Error('A senha mestra não está ativa.');
      if (!(await verifyPassword(session, current))) throw new WrongPasswordError();
      assertStrong(next);
      setSession(await createVaultSession(next));
    },
    [session]
  );

  const disable = useCallback(
    async (current: string) => {
      if (!session) return;
      if (!(await verifyPassword(session, current))) throw new WrongPasswordError();
      setSession(null);
    },
    [session]
  );

  const setSettings = useCallback((patch: Partial<SecuritySettings>) => {
    setSettingsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  return useMemo(
    () => ({
      session,
      enabled: session !== null,
      settings,
      dialogOpen,
      actions: { enable, changePassword, disable, adopt: setSession, setSettings, openDialog, closeDialog },
    }),
    [session, settings, dialogOpen, enable, changePassword, disable, setSettings, openDialog, closeDialog]
  );
}

export type Vault = ReturnType<typeof useVault>;
