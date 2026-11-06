import { createContext, useContext } from 'react';
import type { EnvironmentActions } from '../../hooks/useEnvironments';
import type { LayoutPreset } from '../../lib/dockLayout';
import type { Environment, LogEntry, RequestPart, RequestRuntime, SavedRequest } from '../../types';

/**
 * Tudo o que os painéis do workspace precisam. Os painéis são montados pelo
 * dockview (fora da árvore de props), por isso leem daqui em vez de props.
 */
export interface WorkbenchValue {
  request: {
    active: SavedRequest | null;
    runtime: RequestRuntime;
    onChange: (changes: Partial<SavedRequest>) => void;
    onSend: () => void;
    /** Abre a documentação da coleção da requisição ativa, no endpoint dela. */
    onShowDocs: () => void;
    onCopyResponse: () => void;
    onCreate: () => void;
  };
  environment: {
    list: Environment[];
    active: Environment | null;
    actions: EnvironmentActions;
  };
  logs: {
    entries: LogEntry[];
    onClear: () => void;
    onSave: () => void;
  };
  dock: {
    detachedParts: RequestPart[];
    detach: (part: RequestPart) => void;
    dockBack: (part: RequestPart) => void;
    applyPreset: (preset: LayoutPreset) => void;
  };
}

const WorkbenchContext = createContext<WorkbenchValue | null>(null);

export const WorkbenchProvider = WorkbenchContext.Provider;

export function useWorkbench(): WorkbenchValue {
  const value = useContext(WorkbenchContext);
  if (!value) throw new Error('useWorkbench precisa estar dentro de <WorkbenchProvider>.');
  return value;
}
