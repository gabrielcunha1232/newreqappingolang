import type { FunctionComponent, KeyboardEvent, ReactNode } from 'react';
import type { IDockviewPanelProps, IWatermarkPanelProps } from 'dockview';
import { generateId } from '../../lib/id';
import type { PanelId, RequestPart } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ConsoleView } from '../console/ConsoleView';
import { EnvironmentEditor } from '../environment/EnvironmentEditor';
import { RequestEditor } from '../request/RequestEditor';
import { REQUEST_PART_EDITORS } from '../request/RequestParts';
import { ResponseViewer } from '../response/ResponseViewer';
import { useWorkbench } from './WorkbenchContext';

/** Conteúdo com rolagem e espaçamento padrão; Ctrl+Enter envia a requisição. */
function PanelFrame({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary label="este painel">
      <PanelFrameContent>{children}</PanelFrameContent>
    </ErrorBoundary>
  );
}

function PanelFrameContent({ children }: { children: ReactNode }) {
  const { request } = useWorkbench();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !request.runtime.loading) {
      event.preventDefault();
      request.onSend();
    }
  };
  return (
    <div className="dock-panel" onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

function NoActiveRequest() {
  const { request } = useWorkbench();
  return (
    <EmptyState icon="▤" title="Nenhuma requisição aberta">
      Abra uma requisição pela barra lateral ou{' '}
      <button className="link" onClick={request.onCreate}>
        crie uma nova
      </button>
      .
    </EmptyState>
  );
}

/** Nomes das variáveis habilitadas do ambiente ativo. */
function useVariableNames(): string[] {
  const { environment } = useWorkbench();
  return (environment.active?.variables ?? []).filter((v) => v.enabled && v.key.trim()).map((v) => v.key.trim());
}

function RequestPanel() {
  const { request, dock } = useWorkbench();
  const variableNames = useVariableNames();
  return (
    <PanelFrame>
      {request.active ? (
        <RequestEditor
          key={request.active.id}
          request={request.active}
          loading={request.runtime.loading}
          error={request.runtime.error}
          detachedParts={dock.detachedParts}
          onDetach={dock.detach}
          variableNames={variableNames}
          onChange={request.onChange}
          onSend={request.onSend}
          onShowDocs={request.onShowDocs}
          onPasteCurl={request.onPasteCurl}
          onCopyCurl={request.onCopyCurl}
        />
      ) : (
        <NoActiveRequest />
      )}
    </PanelFrame>
  );
}

/** Painel de uma parte destacada da requisição (Corpo, Cabeçalhos...). */
function partPanel(part: RequestPart): FunctionComponent<IDockviewPanelProps> {
  const Editor = REQUEST_PART_EDITORS[part];
  return function RequestPartPanel() {
    const { request } = useWorkbench();
    const variableNames = useVariableNames();
    return (
      <PanelFrame>
        {request.active ? (
          <Editor request={request.active} onChange={request.onChange} variableNames={variableNames} />
        ) : (
          <NoActiveRequest />
        )}
      </PanelFrame>
    );
  };
}

function EnvironmentPanel() {
  const { environment } = useWorkbench();
  return (
    <PanelFrame>
      <EnvironmentEditor environments={environment.list} active={environment.active} actions={environment.actions} />
    </PanelFrame>
  );
}

function ResponsePanel() {
  const { request, environment } = useWorkbench();
  const active = request.active;
  const rules = active?.extractions ?? [];
  const extract = active
    ? {
        rules,
        hasEnvironment: Boolean(environment.active),
        onAdd: (path: string, variable: string, value: string) => {
          request.onChange({ extractions: [...rules.filter((rule) => rule.variable !== variable), { id: generateId(), path, variable }] });
          environment.actions.applyChanges({ [variable]: value });
        },
        onRemove: (id: string) => request.onChange({ extractions: rules.filter((rule) => rule.id !== id) }),
      }
    : undefined;
  return (
    <PanelFrame>
      <ResponseViewer
        previous={request.runtime.previous}
        response={request.runtime.response}
        error={request.runtime.error}
        loading={request.runtime.loading}
        tests={request.runtime.tests}
        scriptError={request.runtime.scriptError}
        doc={request.active?.doc}
        onDocChange={request.active ? (doc) => request.onChange({ doc }) : undefined}
        extract={extract}
        restoredAt={request.runtime.restored ? request.runtime.receivedAt : undefined}
      />
    </PanelFrame>
  );
}

function ConsolePanel() {
  const { logs } = useWorkbench();
  return (
    <PanelFrame>
      <ConsoleView entries={logs.entries} onClear={logs.onClear} onSave={logs.onSave} />
    </PanelFrame>
  );
}

/** Mapa id → componente usado pelo dockview (precisa ser estável). */
export const DOCK_COMPONENTS: Record<PanelId, FunctionComponent<IDockviewPanelProps>> = {
  request: RequestPanel,
  params: partPanel('params'),
  auth: partPanel('auth'),
  headers: partPanel('headers'),
  body: partPanel('body'),
  env: EnvironmentPanel,
  response: ResponsePanel,
  console: ConsolePanel,
};

/** Exibido quando todos os painéis foram fechados. */
export function DockWatermark(_props: IWatermarkPanelProps) {
  const { dock } = useWorkbench();
  return (
    <EmptyState icon="▦" title="Todos os painéis foram fechados">
      Reabra pelo menu Visualizar ou{' '}
      <button className="link" onClick={() => dock.applyPreset('default')}>
        restaure o layout padrão
      </button>
      .
    </EmptyState>
  );
}
