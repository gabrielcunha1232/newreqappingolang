import { DockviewReact, type DockviewReadyEvent, type DockviewTheme } from 'dockview';
import type { SavedRequest } from '../../types';
import { DockHeaderActions } from './DockHeaderActions';
import { DOCK_COMPONENTS, DockWatermark } from './DockPanels';
import { RequestTabsBar } from './RequestTabsBar';
import { WorkbenchProvider, type WorkbenchValue } from './WorkbenchContext';

const THEME: DockviewTheme = {
  name: 'newpostman',
  className: 'dockview-theme-newpostman',
  gap: 9,
};

export interface WorkspaceProps {
  tabs: {
    open: SavedRequest[];
    activeId: string | null;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
    onAdd: () => void;
  };
  workbench: WorkbenchValue;
  onDockReady: (event: DockviewReadyEvent) => void;
}

export function Workspace({ tabs, workbench, onDockReady }: WorkspaceProps) {
  return (
    <main className="workspace">
      <RequestTabsBar
        tabs={tabs.open}
        activeId={tabs.activeId}
        onActivate={tabs.onActivate}
        onClose={tabs.onClose}
        onAdd={tabs.onAdd}
      />

      <WorkbenchProvider value={workbench}>
        <div className="dock-host">
          <DockviewReact
            theme={THEME}
            components={DOCK_COMPONENTS}
            rightHeaderActionsComponent={DockHeaderActions}
            watermarkComponent={DockWatermark}
            onReady={onDockReady}
          />
        </div>
      </WorkbenchProvider>
    </main>
  );
}
