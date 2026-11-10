import { useEffect, useState } from 'react';
import type { IDockviewHeaderActionsProps } from 'dockview';
import { isRequestPart } from '../../lib/panels';
import { ResponseMeta } from '../response/ResponseViewer';
import { useWorkbench } from './WorkbenchContext';

export function DockHeaderActions({ activePanel, group, containerApi }: IDockviewHeaderActionsProps) {
  const { request, logs, dock } = useWorkbench();
  const [maximized, setMaximized] = useState(() => group.api.isMaximized());

  useEffect(() => {
    const listener = containerApi.onDidMaximizedGroupChange(() => setMaximized(group.api.isMaximized()));
    return () => listener.dispose();
  }, [containerApi, group]);

  const id = activePanel?.id ?? '';

  return (
    <div className="dock-actions">
      {id === 'response' && (
        <ResponseMeta response={request.runtime.response} loading={request.runtime.loading} onCopy={request.onCopyResponse} />
      )}
      {id === 'console' && <span>{logs.entries.length} linhas</span>}
      {isRequestPart(id) && (
        <button className="icon" onClick={() => dock.dockBack(id)} title="Encaixar de volta na requisição">
          ⇲
        </button>
      )}
      <button
        className="icon"
        onClick={() => (maximized ? group.api.exitMaximized() : group.api.maximize())}
        title={maximized ? 'Restaurar' : 'Maximizar'}
      >
        {maximized ? '⤡' : '⤢'}
      </button>
    </div>
  );
}
