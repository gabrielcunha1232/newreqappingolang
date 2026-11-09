import { useCallback, useMemo, useState } from 'react';
import { parseBackup, serializeBackup } from '../lib/backup';
import { downloadText } from '../lib/download';
import { buildPostmanCollection, postmanFileName } from '../lib/exporters/postman';
import { deserialize, type AppSnapshot } from '../services/persistenceService';
import type { Logger } from './useConsole';
import type { ShowToast } from './useToast';

interface Deps {
  snapshot: AppSnapshot;
  hydrate: (snapshot: AppSnapshot) => void;
  log: Logger;
  notify: ShowToast;
}

export interface BackupSummary {
  exportedAt: string;
  collections: number;
  requests: number;
  environments: number;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

export function useDataTransfer({ snapshot, hydrate, log, notify }: Deps) {
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
    downloadText(fileName, serializeBackup(snapshot));
    log('ok', `Backup: dados salvos em ${fileName}`);
    log('warn', 'Backup: o arquivo contém tokens e senhas salvos no app. Guarde-o em local seguro.');
    notify('Backup salvo. Ele contém seus tokens e senhas: guarde com cuidado.');
  }, [snapshot, log, notify]);

  const inspectBackup = useCallback((content: string): BackupSummary => {
    const { exportedAt, state } = parseBackup(content);
    return {
      exportedAt,
      collections: state.collections?.length ?? 0,
      requests: state.requests?.length ?? 0,
      environments: state.environments?.length ?? 0,
    };
  }, []);

  const restoreBackup = useCallback(
    (content: string) => {
      const restored = deserialize(parseBackup(content).state);
      const safetyCopy = `forkarsenet-antes-da-restauracao-${stamp()}.json`;
      downloadText(safetyCopy, serializeBackup(snapshot));
      hydrate(restored);
      setRestoreOpen(false);
      log('ok', `Backup restaurado. Os dados anteriores foram salvos em ${safetyCopy}`);
      notify('Backup restaurado.');
    },
    [snapshot, hydrate, log, notify]
  );

  const openRestore = useCallback(() => setRestoreOpen(true), []);
  const closeRestore = useCallback(() => setRestoreOpen(false), []);

  return useMemo(
    () => ({ restoreOpen, openRestore, closeRestore, exportPostman, exportBackup, inspectBackup, restoreBackup }),
    [restoreOpen, openRestore, closeRestore, exportPostman, exportBackup, inspectBackup, restoreBackup]
  );
}
