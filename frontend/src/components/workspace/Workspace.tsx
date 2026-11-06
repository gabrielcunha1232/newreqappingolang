import type { ReactNode } from 'react';
import { DockviewReact, type DockviewReadyEvent, type DockviewTheme } from 'dockview';
import { DockHeaderActions } from './DockHeaderActions';
import { DOCK_COMPONENTS, DockWatermark } from './DockPanels';
import { WorkbenchProvider, type WorkbenchValue } from './WorkbenchContext';
import { WorkspaceTabsBar, type DocsTabsProps, type RequestTabsProps } from './WorkspaceTabsBar';

const THEME: DockviewTheme = {
  name: 'forkarsenet',
  className: 'dockview-theme-forkarsenet',
  gap: 9,
};

export interface WorkspaceProps {
  tabs: {
    requests: RequestTabsProps;
    docs: DocsTabsProps;
  };
  /** Conteúdo das abas de documentação (mostrado no lugar dos painéis quando uma delas está ativa). */
  docsContent: ReactNode;
  workbench: WorkbenchValue;
  onDockReady: (event: DockviewReadyEvent) => void;
}

export function Workspace({ tabs, docsContent, workbench, onDockReady }: WorkspaceProps) {
  const showingDocs = tabs.docs.activeId !== null;

  return (
    <main className="workspace">
      <WorkspaceTabsBar requests={tabs.requests} docs={tabs.docs} />

      <div className="workspace-body">
        {/* Os painéis continuam montados e com tamanho: escondê-los com display:none desmontaria o layout do dockview. */}
        <WorkbenchProvider value={workbench}>
          <div className={'dock-host' + (showingDocs ? ' covered' : '')} aria-hidden={showingDocs}>
            <DockviewReact
              theme={THEME}
              components={DOCK_COMPONENTS}
              rightHeaderActionsComponent={DockHeaderActions}
              watermarkComponent={DockWatermark}
              onReady={onDockReady}
            />
          </div>
        </WorkbenchProvider>

        <div className="docs-host" hidden={!showingDocs}>
          {docsContent}
        </div>
      </div>
    </main>
  );
}
