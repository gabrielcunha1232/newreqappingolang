import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DocsTabsHost } from './components/docs/DocsTabsHost';
import { ApiScanner } from './components/sidebar/ApiScanner';
import { CollectionsTree } from './components/sidebar/CollectionsTree';
import { HistoryList } from './components/sidebar/HistoryList';
import { Sidebar } from './components/sidebar/Sidebar';
import { Toast } from './components/common/Toast';
import { Workspace } from './components/workspace/Workspace';
import { useApiDocs } from './hooks/useApiDocs';
import { useAppMenus } from './hooks/useAppMenus';
import { useConsole } from './hooks/useConsole';
import { useDockLayout } from './hooks/useDockLayout';
import { useEnvironments } from './hooks/useEnvironments';
import { useHistory } from './hooks/useHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePersistence } from './hooks/usePersistence';
import { useRequestRunner } from './hooks/useRequestRunner';
import { useToast } from './hooks/useToast';
import { useWorkspace } from './hooks/useWorkspace';
import { useWorkspaceHandlers } from './hooks/useWorkspaceHandlers';
import type { SidebarView } from './types';

/**
 * Composição da aplicação: liga os hooks de estado (camada de estado/serviços)
 * aos componentes visuais. Regras de negócio ficam em hooks/, services/ e lib/.
 */
function App() {
  const [sidebarView, setSidebarView] = useState<SidebarView>('collections');

  const workspace = useWorkspace();
  const environments = useEnvironments();
  const history = useHistory();
  const logger = useConsole();
  const toast = useToast();
  const dock = useDockLayout();
  const runner = useRequestRunner({ log: logger.log, onComplete: history.actions.add });

  const docs = useApiDocs({ workspace, dockActions: dock.actions });

  const handlers = useWorkspaceHandlers({ workspace, environments, history, logger, runner, toast });
  usePersistence(handlers.snapshot, handlers.hydrate);
  useKeyboardShortcuts(handlers.shortcuts);
  const menus = useAppMenus({ workspace, dock, logger, toast, onShowSidebar: setSidebarView, onShowDocs: docs.showForActiveRequest });

  const { state } = workspace;

  return (
    <>
      <AppShell
        menus={menus}
        sidebar={
          <Sidebar view={sidebarView} onViewChange={setSidebarView}>
            <div className="side-view" hidden={sidebarView !== 'collections'}>
              <CollectionsTree
                collections={state.collections}
                requests={state.requests}
                activeRequestId={state.activeRequestId}
                actions={workspace.actions}
                onShowDocs={docs.show}
              />
            </div>
            <div className="side-view" hidden={sidebarView !== 'history'}>
              <HistoryList
                entries={history.entries}
                onOpen={handlers.openHistoryEntry}
                onClear={history.actions.clear}
              />
            </div>
            <div className="side-view" hidden={sidebarView !== 'apis'}>
              <ApiScanner onScanComplete={handlers.importScan} onEndpointSelect={handlers.openEndpoint} />
            </div>
          </Sidebar>
        }
      >
        <Workspace
          tabs={{
            requests: {
              open: handlers.openTabs,
              activeId: state.activeRequestId,
              onActivate: workspace.actions.activateTab,
              onClose: workspace.actions.closeTab,
              onAdd: () => workspace.actions.createRequest(),
            },
            docs: {
              open: docs.scopes,
              activeId: docs.activeId,
              onActivate: workspace.actions.openDocs,
              onClose: workspace.actions.closeDocs,
            },
          }}
          docsContent={
            <DocsTabsHost
              scopes={docs.scopes}
              activeId={docs.activeId}
              requests={state.requests}
              focus={docs.focus}
              onTryIt={docs.tryIt}
            />
          }
          workbench={{
            request: {
              active: workspace.activeRequest,
              runtime: runner.get(state.activeRequestId),
              onChange: handlers.updateActiveRequest,
              onSend: handlers.sendActiveRequest,
              onShowDocs: docs.showForActiveRequest,
              onCopyResponse: handlers.copyActiveResponse,
              onCreate: () => workspace.actions.createRequest(),
            },
            environment: {
              list: environments.environments,
              active: environments.active,
              actions: environments.actions,
            },
            logs: { entries: logger.entries, onClear: logger.clear, onSave: handlers.saveLogs },
            dock: {
              detachedParts: dock.detachedParts,
              detach: dock.actions.detach,
              dockBack: dock.actions.dockBack,
              applyPreset: dock.actions.applyPreset,
            },
          }}
          onDockReady={dock.onReady}
        />
      </AppShell>
      <Toast message={toast.message} />
    </>
  );
}

export default App;
