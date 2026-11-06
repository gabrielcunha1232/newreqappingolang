import { useContextMenu } from '../../hooks/useContextMenu';
import type { DocsScope } from '../../lib/apiDocsScope';
import { methodShort } from '../../lib/format';
import type { SavedRequest } from '../../types';
import { ContextMenu } from '../common/ContextMenu';
import { WorkspaceTab } from './WorkspaceTab';
import { DocsTabMenu, RequestTabMenu } from './WorkspaceTabMenus';

export interface RequestTabsProps {
  open: SavedRequest[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onCloseMany: (ids: string[]) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onCopyCurl: (id: string) => void;
  onShowDocs: (request: SavedRequest) => void;
}

export interface DocsTabsProps {
  open: DocsScope[];
  /** Aba de documentação em primeiro plano; null = a requisição ativa está em primeiro plano. */
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onCloseMany: (ids: string[]) => void;
  onExport: (scope: DocsScope) => void;
}

type TabTarget = { kind: 'request'; tab: SavedRequest } | { kind: 'docs'; scope: DocsScope };

interface WorkspaceTabsBarProps {
  requests: RequestTabsProps;
  docs: DocsTabsProps;
}

/** Barra de abas do topo: documentação das coleções primeiro, depois as requisições abertas. */
export function WorkspaceTabsBar({ requests, docs }: WorkspaceTabsBarProps) {
  const showingDocs = docs.activeId !== null;
  const { menu, openAt, close } = useContextMenu<TabTarget>();

  return (
    <div className="tabsbar">
      <div className="tabs-scroll" role="tablist">
        {docs.open.map((scope) => (
          <WorkspaceTab
            key={`docs:${scope.id}`}
            className="docs-tab"
            label={scope.label}
            tooltip={`Documentação de ${scope.label}`}
            leading={<small className="tab-docs">DOCS</small>}
            active={scope.id === docs.activeId}
            onActivate={() => docs.onActivate(scope.id)}
            onClose={() => docs.onClose(scope.id)}
            onContextMenu={(event) => openAt(event, { kind: 'docs', scope })}
          />
        ))}

        {docs.open.length > 0 && requests.open.length > 0 && <span className="tabs-divider" aria-hidden="true" />}

        {requests.open.map((tab) => (
          <WorkspaceTab
            key={tab.id}
            label={tab.title}
            tooltip={`${tab.method} ${tab.url}`}
            leading={<small className={'tab-method m-' + tab.method.toLowerCase()}>{methodShort(tab.method)}</small>}
            active={!showingDocs && tab.id === requests.activeId}
            onActivate={() => requests.onActivate(tab.id)}
            onClose={() => requests.onClose(tab.id)}
            onContextMenu={(event) => openAt(event, { kind: 'request', tab })}
          />
        ))}
      </div>
      <button className="addtab" onClick={requests.onAdd} title="Nova requisição (Ctrl+T)">
        ＋
      </button>
      <span className="hint tabs-hint">Dica: clique com o botão direito nas abas e na barra lateral para mais opções</span>

      {menu && (
        <ContextMenu position={menu.position} onClose={close}>
          {menu.target.kind === 'request' ? (
            <RequestTabMenu tab={menu.target.tab} tabs={requests} />
          ) : (
            <DocsTabMenu scope={menu.target.scope} docs={docs} />
          )}
        </ContextMenu>
      )}
    </div>
  );
}
