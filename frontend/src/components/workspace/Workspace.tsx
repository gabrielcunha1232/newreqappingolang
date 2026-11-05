import type { ReactNode } from 'react';
import type { EnvironmentActions } from '../../hooks/useEnvironments';
import type { PanelLayout, PanelLayoutActions } from '../../hooks/usePanelLayout';
import type { Environment, LogEntry, PanelId, RequestRuntime, SavedRequest } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { ConsoleView } from '../console/ConsoleView';
import { EnvironmentEditor } from '../environment/EnvironmentEditor';
import { RequestEditor } from '../request/RequestEditor';
import { ResponseMeta, ResponseViewer } from '../response/ResponseViewer';
import { Panel } from './Panel';
import { PanelGrid } from './PanelGrid';
import { RequestTabsBar } from './RequestTabsBar';

export interface WorkspaceProps {
  tabs: {
    open: SavedRequest[];
    activeId: string | null;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
    onAdd: () => void;
  };
  request: {
    active: SavedRequest | null;
    runtime: RequestRuntime;
    onChange: (changes: Partial<SavedRequest>) => void;
    onSend: () => void;
    onCopyResponse: () => void;
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
  layout: {
    state: PanelLayout;
    actions: PanelLayoutActions;
  };
}

interface PanelContent {
  title: ReactNode;
  actions?: ReactNode;
  body: ReactNode;
  className: string;
}

export function Workspace({ tabs, request, environment, logs, layout }: WorkspaceProps) {
  const { active, runtime } = request;

  const hide = (id: PanelId) => (
    <button className="icon" onClick={() => layout.actions.setVisible(id, false)} title="Ocultar painel">
      ×
    </button>
  );

  const panels: Record<PanelId, PanelContent> = {
    request: {
      title: <>▤ &nbsp; REQUISIÇÃO</>,
      className: 'request-panel',
      body: active && (
        <RequestEditor
          key={active.id}
          request={active}
          loading={runtime.loading}
          error={runtime.error}
          onChange={request.onChange}
          onSend={request.onSend}
        />
      ),
    },
    env: {
      title: <>♧ &nbsp; AMBIENTE</>,
      className: 'env-panel',
      actions: hide('env'),
      body: (
        <EnvironmentEditor
          environments={environment.list}
          active={environment.active}
          actions={environment.actions}
        />
      ),
    },
    response: {
      title: <>▣ &nbsp; RESPOSTA</>,
      className: 'response-panel',
      actions: <ResponseMeta response={runtime.response} loading={runtime.loading} onCopy={request.onCopyResponse} />,
      body: <ResponseViewer response={runtime.response} error={runtime.error} loading={runtime.loading} />,
    },
    console: {
      title: (
        <>
          ▣ &nbsp; CONSOLE　 <span className="muted">{logs.entries.length} linhas</span>
        </>
      ),
      className: 'console-panel',
      actions: hide('console'),
      body: <ConsoleView entries={logs.entries} onClear={logs.onClear} onSave={logs.onSave} />,
    },
  };

  return (
    <main className="workspace">
      <RequestTabsBar
        tabs={tabs.open}
        activeId={tabs.activeId}
        onActivate={tabs.onActivate}
        onClose={tabs.onClose}
        onAdd={tabs.onAdd}
      />

      {active ? (
        <PanelGrid
          layout={layout.state}
          renderPanel={({ id, row, style }) => {
            const content = panels[id];
            return (
              <Panel
                key={id}
                id={id}
                title={content.title}
                actions={content.actions}
                className={content.className}
                style={style}
                onSwap={layout.actions.swap}
                onResize={(height) => layout.actions.setRowHeight(row, height)}
              >
                {content.body}
              </Panel>
            );
          }}
        />
      ) : (
        <EmptyState icon="▤" title="Nenhuma requisição aberta">
          Abra uma requisição pela barra lateral ou{' '}
          <button className="link" onClick={tabs.onAdd}>
            crie uma nova
          </button>
          .
        </EmptyState>
      )}
    </main>
  );
}
