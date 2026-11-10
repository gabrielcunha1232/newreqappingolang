import { useCallback, useMemo, useState } from 'react';
import { parseBackup, serializeBackup } from '../lib/backup';
import { downloadText } from '../lib/download';
import { buildPostmanCollection, postmanFileName } from '../lib/exporters/postman';
import { injectSecrets } from '../lib/secretFields';
import { isEncryptedVault, openVault, type VaultSession } from '../lib/vault';
import { deserialize, storedState, withoutSecrets, type AppSnapshot } from '../services/persistenceService';
import type { Logger } from './useConsole';
import type { ShowToast } from './useToast';

interface Deps {
  snapshot: AppSnapshot;
  session: VaultSession | null;
  hydrate: (snapshot: AppSnapshot) => void;
  log: Logger;
  notify: ShowToast;
}

export interface BackupSummary {
  exportedAt: string;
  collections: number;
  requests: number;
  environments: number;
  encrypted: boolean;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

async function fullBackup(snapshot: AppSnapshot, session: VaultSession | null): Promise<string> {
  const everything: AppSnapshot = {
    ...snapshot,
    security: { ...snapshot.security, persistAccessTokens: true, maskStoredResponses: false },
  };
  const state = session ? await storedState(everything, session) : everything;
  return serializeBackup({ ...state, security: snapshot.security });
}

export function useDataTransfer({ snapshot, session, hydrate, log, notify }: Deps) {
  const [restoreOpen, setRestoreOpen] = useState(false);

  const exportPostman = useCallback(
    (collectionId: string) => {
      const collection = snapshot.collections.find((c) => c.id === collectionId);
      if (!collection) return;
      const { document, warnings } = buildPostmanCollection(collection, snapshot.folders, snapshot.requests);
      const fileName = postmanFileName(collection.name);
      downloadText(fileName, JSON.stringify(document, null, 2));
      log('ok', `Postman: "${collection.name}" exportada para ${fileName}`);
      warnings.forEach((warning) => log('warn', `Postman: ${warning}`));
      notify(warnings.length > 0 ? `Coleção exportada com ${warnings.length} aviso(s). Veja o console.` : 'Coleção exportada.');
    },
    [snapshot, log, notify]
  );

  const exportBackup = useCallback(() => {
    const fileName = `forkarsenet-backup-${stamp()}.json`;
    downloadText(fileName, serializeBackup(withoutSecrets(snapshot)));
    log('ok', `Backup: dados salvos em ${fileName}, sem tokens, senhas e variáveis secretas.`);
    notify('Backup salvo sem segredos.');
  }, [snapshot, log, notify]);

  const exportBackupWithSecrets = useCallback(async () => {
    const fileName = `forkarsenet-backup-completo-${stamp()}.json`;
    try {
      downloadText(fileName, await fullBackup(snapshot, session));
    } catch (err) {
      log('error', `Backup: ${err instanceof Error ? err.message : String(err)}`);
      notify('Não foi possível gerar o backup.');
      return;
    }
    if (session) {
      log('ok', `Backup: dados salvos em ${fileName}. Os segredos estão criptografados com a senha mestra atual.`);
      notify('Backup salvo com segredos criptografados.');
    } else {
      log('ok', `Backup: dados salvos em ${fileName}`);
      log('warn', 'Backup: o arquivo contém tokens e senhas em texto puro. Ative a senha mestra para criptografá-los.');
      notify('Backup salvo. Ele contém seus tokens e senhas em texto puro: guarde com cuidado.');
    }
  }, [snapshot, session, log, notify]);

  const inspectBackup = useCallback((content: string): BackupSummary => {
    const { exportedAt, state } = parseBackup(content);
    return {
      exportedAt,
      collections: state.collections?.length ?? 0,
      requests: state.requests?.length ?? 0,
      environments: state.environments?.length ?? 0,
      encrypted: isEncryptedVault(state.vault),
    };
  }, []);

  const restoreBackup = useCallback(
    async (content: string, password = '') => {
      const { state } = parseBackup(content);
      let restored = deserialize(state);
      if (isEncryptedVault(state.vault)) {
        const { secrets } = await openVault(state.vault, password);
        restored = injectSecrets(restored, secrets);
      }
      const safetyCopy = `forkarsenet-antes-da-restauracao-${stamp()}.json`;
      downloadText(safetyCopy, await fullBackup(snapshot, session));
      hydrate(restored);
      setRestoreOpen(false);
      log('ok', `Backup restaurado. Os dados anteriores foram salvos em ${safetyCopy}`);
      notify('Backup restaurado.');
    },
    [snapshot, session, hydrate, log, notify]
  );

  const openRestore = useCallback(() => setRestoreOpen(true), []);
  const closeRestore = useCallback(() => setRestoreOpen(false), []);

  return useMemo(
    () => ({
      restoreOpen,
      openRestore,
      closeRestore,
      exportPostman,
      exportBackup,
      exportBackupWithSecrets,
      inspectBackup,
      restoreBackup,
    }),
    [restoreOpen, openRestore, closeRestore, exportPostman, exportBackup, exportBackupWithSecrets, inspectBackup, restoreBackup]
  );
}
