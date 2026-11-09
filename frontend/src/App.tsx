import { useCallback, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DocsTabsHost } from './components/docs/DocsTabsHost';
import type { EndpointActions } from './components/docs/endpointActions';
import { ApiScanner } from './components/sidebar/ApiScanner';
import { AuthSettingsDialog, type AuthTarget } from './components/sidebar/AuthSettingsDialog';
import { CollectionsTree } from './components/sidebar/CollectionsTree';
import type { TreeCommands } from './components/sidebar/CollectionsTreeMenus';
import { HistoryList } from './components/sidebar/HistoryList';
import { Sidebar } from './components/sidebar/Sidebar';
import { GlobalSearchDialog } from './components/common/GlobalSearchDialog';
import { HelpDialog } from './components/common/HelpDialog';
import { Toast } from './components/common/Toast';
import { Workspace } from './components/workspace/Workspace';
import { ImportOpenApiDialog } from './components/import/ImportOpenApiDialog';
import { ImportCurlDialog } from './components/import/ImportCurlDialog';
import { ImportCollectionDialog } from './components/import/ImportCollectionDialog';
import { RestoreBackupDialog } from './components/import/RestoreBackupDialog';
import { CollectionRunnerDialog } from './components/runner/CollectionRunnerDialog';
import { GenerateCodeDialog } from './components/request/GenerateCodeDialog';
import { useApiDocs } from './hooks/useApiDocs';
import { GLOBAL_SEARCH_LABEL, useAppMenus } from './hooks/useAppMenus';
import { useConsole } from './hooks/useConsole';
import { useCodeGeneration } from './hooks/useCodeGeneration';
import { useCollectionImport } from './hooks/useCollectionImport';
import { useCollectionRunner } from './hooks/useCollectionRunner';
import { useCurl } from './hooks/useCurl';
import { useDataTransfer } from './hooks/useDataTransfer';
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
import { buildSearchItems } from './lib/globalSearch';
import { hideSecrets } from './lib/secrets';
import type { HistoryEntry, LogLevel, SidebarView } from './types';

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
  const [authTarget, setAuthTarget] = useState<AuthTarget | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<string | null>(null);
  const secretsRef = useRef(environments.secrets);
  secretsRef.current = environments.secrets;
  const mask = useCallback((text: string) => hideSecrets(text, secretsRef.current), []);
  const logMasked = useCallback((level: LogLevel, message: string) => logger.log(level, mask(message)), [logger.log, mask]);
  const addHistory = history.actions.add;
  const recordHistory = useCallback(
    (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => addHistory({ ...entry, url: mask(entry.url) }),
    [addHistory, mask]
  );
  const runner = useRequestRunner({
    onAuthRenewed: workspace.actions.storeRenewedAuth,
    log: logMasked,
    mask,
    onComplete: recordHistory,
    onEnvironmentChanges: environments.actions.applyChanges,
  });

  const docs = useApiDocs({
    workspace,
    dockActions: dock.actions,
    variables: environments.shareable,
    log: logger.log,
    notify: toast.show,
  });

  const openApiImport = useOpenApiImport({ workspace, log: logger.log, notify: toast.show });
  const curl = useCurl({ workspace, variables: environments.shareable, log: logger.log, notify: toast.show });

  const collectionImport = useCollectionImport({ workspace, environments, log: logger.log, notify: toast.show });
  const codeGeneration = useCodeGeneration({ workspace, variables: environments.shareable, notify: toast.show });
  const collectionRunner = useCollectionRunner({ workspace, variables: environments.variables, runner, log: logMasked });

  const handlers = useWorkspaceHandlers({ workspace, environments, history, logger, runner, toast });
  usePersistence(handlers.snapshot, handlers.hydrate);
  const dataTransfer = useDataTransfer({
    snapshot: handlers.snapshot,
    hydrate: handlers.hydrate,
    log: logger.log,
    notify: toast.show,
  });
  useKeyboardShortcuts({ ...handlers.shortcuts, globalSearch: () => setSearchOpen(true), help: () => setHelpTopic('inicio') });
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
    onExportBackup: dataTransfer.exportBackup,
    onRestoreBackup: dataTransfer.openRestore,
    onGlobalSearch: () => setSearchOpen(true),
    onHelp: (topic = 'inicio') => setHelpTopic(topic),
  });

  const { state } = workspace;
  const searchItems = searchOpen
    ? buildSearchItems(
        {
          collections: state.collections,
          folders: state.folders,
          requests: state.requests,
          openRequestIds: state.openRequestIds,
          environments: environments.environments,
          menus,
          excludedCommands: [GLOBAL_SEARCH_LABEL],
        },
        {
          openRequest: docs.tryIt,
          revealCollection: (id) => {
            setSidebarView('collections');
            workspace.actions.setCollectionCollapsed(id, false);
          },
          revealFolder: (folderIds, collectionId) => {
            setSidebarView('collections');
            workspace.actions.setCollectionCollapsed(collectionId, false);
            folderIds.forEach((id) => workspace.actions.setFolderCollapsed(id, false));
          },
          selectEnvironment: (environment) => {
            environments.actions.select(environment.id);
            toast.show(`Ambiente "${environment.name}" ativado.`);
          },
        }
      )
    : [];
  const authOwner =
    authTarget?.kind === 'folder'
      ? state.folders.find((f) => f.id === authTarget.id)
      : state.collections.find((c) => c.id === authTarget?.id);

  const endpointActions = useMemo<EndpointActions>(
    () => ({ tryIt: docs.tryIt, copyCurl: curl.copyAsCurl, copyText: handlers.copyText }),
    [docs.tryIt, curl.copyAsCurl, handlers.copyText]
  );

  const treeCommands = useMemo<TreeCommands>(
    () => ({
      showDocs: docs.show,
      exportOpenApi: docs.exportCollection,
      exportPostman: dataTransfer.exportPostman,
      copyCurl: curl.copyAsCurl,
      generateCode: codeGeneration.open,
      runCollection: collectionRunner.open,
      configureAuth: setAuthTarget,
      importCollection: collectionImport.openDialog,
      copyText: handlers.copyText,
      importSpec: openApiImport.openDialog,
      importCurl: curl.openDialog,
    }),
    [
      docs.show,
      docs.exportCollection,
      dataTransfer.exportPostman,
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
                folders={state.folders}
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
              folders={state.folders}
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
      {searchOpen && <GlobalSearchDialog items={searchItems} onClose={() => setSearchOpen(false)} />}
      {helpTopic && <HelpDialog initialTopic={helpTopic} onClose={() => setHelpTopic(null)} />}
      {dataTransfer.restoreOpen && (
        <RestoreBackupDialog
          onClose={dataTransfer.closeRestore}
          onInspect={dataTransfer.inspectBackup}
          onRestore={dataTransfer.restoreBackup}
        />
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
      {authTarget && authOwner && (
        <AuthSettingsDialog
          kind={authTarget.kind}
          name={authOwner.name}
          auth={authOwner.auth}
          variables={environments.variables}
          onClose={() => setAuthTarget(null)}
          onChange={(auth) =>
            authTarget.kind === 'folder'
              ? workspace.actions.setFolderAuth(authTarget.id, auth)
              : workspace.actions.setCollectionAuth(authTarget.id, auth)
          }
        />
      )}
      <Toast message={toast.message} />
    </>
  );
}

export default App;
