import { createContext, useContext } from 'react';
import type { EnvironmentActions } from '../../hooks/useEnvironments';
import type { LayoutPreset } from '../../lib/dockLayout';
import type { Environment, LogEntry, RequestPart, RequestRuntime, SavedRequest } from '../../types';

export interface WorkbenchValue {
  request: {
    active: SavedRequest | null;
    runtime: RequestRuntime;
    onChange: (changes: Partial<SavedRequest>) => void;
    onSend: () => void;
    onShowDocs: () => void;
    onPasteCurl: (command: string) => void;
    onCopyCurl: () => void;
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
