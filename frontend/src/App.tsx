import { useCallback, useMemo, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DocsTabsHost } from './components/docs/DocsTabsHost';
import type { EndpointActions } from './components/docs/endpointActions';
import { ApiScanner } from './components/sidebar/ApiScanner';
import { CollectionsTree } from './components/sidebar/CollectionsTree';
import type { TreeCommands } from './components/sidebar/CollectionsTreeMenus';
import { HistoryList } from './components/sidebar/HistoryList';
import { Sidebar } from './components/sidebar/Sidebar';
import { Toast } from './components/common/Toast';
import { Workspace } from './components/workspace/Workspace';
import { ImportOpenApiDialog } from './components/import/ImportOpenApiDialog';
import { ImportCurlDialog } from './components/import/ImportCurlDialog';
import { ImportCollectionDialog } from './components/import/ImportCollectionDialog';
import { CollectionRunnerDialog } from './components/runner/CollectionRunnerDialog';
import { GenerateCodeDialog } from './components/request/GenerateCodeDialog';
import { useApiDocs } from './hooks/useApiDocs';
import { useAppMenus } from './hooks/useAppMenus';
import { useConsole } from './hooks/useConsole';
import { useCodeGeneration } from './hooks/useCodeGeneration';
import { useCollectionImport } from './hooks/useCollectionImport';
import { useCollectionRunner } from './hooks/useCollectionRunner';
import { useCurl } from './hooks/useCurl';
import { useDockLayout } from './hooks/useDockLayout';
import { useEnvironments } from './hooks/useEnvironments';
import { useHistory } from './hooks/useHistory';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useOpenApiImport } from './hooks/useOpenApiImport';
import { usePersistence } from './hooks/usePersistence';
import { useRequestRunner } from './hooks/useRequestRunner';
import { useToast } from './hooks/useToast';
import { useWorkspace } from './hooks/useWorkspace';
import { useWorkspaceHandlers } from './hooks/useWorkspaceHandlers';
import type { RequestAuth, SidebarView } from './types';

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
  const { updateRequest } = workspace.actions;
  const onAuthRenewed = useCallback(
    (requestId: string, auth: RequestAuth) => updateRequest(requestId, { auth }),
    [updateRequest]
  );
  const runner = useRequestRunner({
    onAuthRenewed,
    log: logger.log,
    onComplete: history.actions.add,
    onEnvironmentChanges: environments.actions.applyChanges,
  });

  const docs = useApiDocs({
    workspace,
    dockActions: dock.actions,
    variables: environments.variables,
    log: logger.log,
    notify: toast.show,
  });

  const openApiImport = useOpenApiImport({ workspace, log: logger.log, notify: toast.show });
  const curl = useCurl({ workspace, variables: environments.variables, log: logger.log, notify: toast.show });

  const collectionImport = useCollectionImport({ workspace, environments, log: logger.log, notify: toast.show });
  const codeGeneration = useCodeGeneration({ workspace, variables: environments.variables, notify: toast.show });
  const collectionRunner = useCollectionRunner({ workspace, variables: environments.variables, runner, log: logger.log });

  const handlers = useWorkspaceHandlers({ workspace, environments, history, logger, runner, toast });
  usePersistence(handlers.snapshot, handlers.hydrate);
  useKeyboardShortcuts(handlers.shortcuts);
  const menus = useAppMenus({
    workspace,
    dock,
    logger,
    toast,
    onShowSidebar: setSidebarView,
    onShowDocs: docs.showForActiveRequest,
    onImportSpec: openApiImport.openDialog,
    onImportCurl: curl.openDialog,
    onImportCollection: collectionImport.openDialog,
    onGenerateCode: () => codeGeneration.open(workspace.state.activeRequestId),
    onCopyCurl: () => curl.copyAsCurl(workspace.state.activeRequestId),
  });

  const { state } = workspace;

  const endpointActions = useMemo<EndpointActions>(
    () => ({ tryIt: docs.tryIt, copyCurl: curl.copyAsCurl, copyText: handlers.copyText }),
    [docs.tryIt, curl.copyAsCurl, handlers.copyText]
  );

  const treeCommands = useMemo<TreeCommands>(
    () => ({
      showDocs: docs.show,
      exportOpenApi: docs.exportCollection,
      copyCurl: curl.copyAsCurl,
      generateCode: codeGeneration.open,
      runCollection: collectionRunner.open,
      importCollection: collectionImport.openDialog,
      copyText: handlers.copyText,
      importSpec: openApiImport.openDialog,
      importCurl: curl.openDialog,
    }),
    [
      docs.show,
      docs.exportCollection,
      curl.copyAsCurl,
      curl.openDialog,
      handlers.copyText,
      openApiImport.openDialog,
      codeGeneration.open,
      collectionRunner.open,
      collectionImport.openDialog,
    ]
  );

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
                commands={treeCommands}
              />
            </div>
            <div className="side-view" hidden={sidebarView !== 'history'}>
              <HistoryList
                entries={history.entries}
                onOpen={handlers.openHistoryEntry}
                onOpenAsNew={handlers.openHistoryAsNew}
                onRemove={history.actions.remove}
                onCopyText={handlers.copyText}
                onClear={history.actions.clear}
              />
            </div>
            <div className="side-view" hidden={sidebarView !== 'apis'}>
              <ApiScanner
                onScanComplete={handlers.importScan}
                onEndpointSelect={handlers.openEndpoint}
                onImportSpec={openApiImport.openDialog}
                onCopyText={handlers.copyText}
              />
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
              onCloseMany: workspace.actions.closeTabs,
              onAdd: () => workspace.actions.createRequest(),
              onDuplicate: workspace.actions.duplicateRequest,
              onCopyCurl: curl.copyAsCurl,
              onGenerateCode: codeGeneration.open,
              onShowDocs: (request) => docs.show(request.collectionId, request.id),
            },
            docs: {
              open: docs.scopes,
              activeId: docs.activeId,
              onActivate: workspace.actions.openDocs,
              onClose: workspace.actions.closeDocs,
              onCloseMany: workspace.actions.closeManyDocs,
              onExport: docs.exportOpenApi,
            },
          }}
          docsContent={
            <DocsTabsHost
              scopes={docs.scopes}
              activeId={docs.activeId}
              requests={state.requests}
              focus={docs.focus}
              endpointActions={endpointActions}
              onExportOpenApi={docs.exportOpenApi}
            />
          }
          workbench={{
            request: {
              active: workspace.activeRequest,
              runtime: runner.get(state.activeRequestId),
              onChange: handlers.updateActiveRequest,
              onSend: handlers.sendActiveRequest,
              onShowDocs: docs.showForActiveRequest,
              onPasteCurl: curl.pasteIntoActive,
              onCopyCurl: () => curl.copyAsCurl(state.activeRequestId),
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
      {openApiImport.dialogOpen && (
        <ImportOpenApiDialog
          onClose={openApiImport.closeDialog}
          onImportText={openApiImport.importText}
          onImportUrl={openApiImport.importUrl}
        />
      )}
      {curl.dialogOpen && <ImportCurlDialog onClose={curl.closeDialog} onImport={curl.importAsNew} />}
      {collectionImport.dialogOpen && (
        <ImportCollectionDialog onClose={collectionImport.closeDialog} onImport={collectionImport.importText} />
      )}
      {codeGeneration.source && (
        <GenerateCodeDialog
          source={codeGeneration.source}
          onClose={codeGeneration.close}
          onCopy={(code) => handlers.copyText(code, 'Código')}
        />
      )}
      {collectionRunner.session && (
        <CollectionRunnerDialog
          session={collectionRunner.session}
          controls={collectionRunner}
          onSaveReport={(report) => handlers.saveText('forkarsenet-runner', report)}
        />
      )}
      <Toast message={toast.message} />
    </>
  );
}

export default App;
