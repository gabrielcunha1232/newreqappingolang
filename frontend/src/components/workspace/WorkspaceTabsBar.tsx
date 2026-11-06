import type { DocsScope } from '../../lib/apiDocsScope';
import { methodShort } from '../../lib/format';
import type { SavedRequest } from '../../types';
import { WorkspaceTab } from './WorkspaceTab';

export interface RequestTabsProps {
  open: SavedRequest[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
}

export interface DocsTabsProps {
  open: DocsScope[];
  /** Aba de documentação em primeiro plano; null = a requisição ativa está em primeiro plano. */
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}

interface WorkspaceTabsBarProps {
  requests: RequestTabsProps;
  docs: DocsTabsProps;
}

/** Barra de abas do topo: documentação das coleções primeiro, depois as requisições abertas. */
export function WorkspaceTabsBar({ requests, docs }: WorkspaceTabsBarProps) {
  const showingDocs = docs.activeId !== null;

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
          />
        ))}
      </div>
      <button className="addtab" onClick={requests.onAdd} title="Nova requisição (Ctrl+T)">
        ＋
      </button>
      <span className="hint tabs-hint">Dica: arraste as abas dos painéis para reorganizar e as bordas para redimensionar</span>
    </div>
  );
}
