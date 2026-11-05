import { methodShort } from '../../lib/format';
import type { SavedRequest } from '../../types';

interface RequestTabsBarProps {
  tabs: SavedRequest[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
}

export function RequestTabsBar({ tabs, activeId, onActivate, onClose, onAdd }: RequestTabsBarProps) {
  return (
    <div className="tabsbar">
      <div className="tabs-scroll">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tab"
            tabIndex={0}
            aria-selected={tab.id === activeId}
            className={'request-tab' + (tab.id === activeId ? ' active' : '')}
            title={`${tab.method} ${tab.url}`}
            onClick={() => onActivate(tab.id)}
            onKeyDown={(event) => event.key === 'Enter' && onActivate(tab.id)}
            onAuxClick={(event) => event.button === 1 && onClose(tab.id)}
          >
            <small className={'tab-method m-' + tab.method.toLowerCase()}>{methodShort(tab.method)}</small>
            <span className="tab-title">{tab.title}</span>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onClose(tab.id);
              }}
              aria-label={`Fechar ${tab.title}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="addtab" onClick={onAdd} title="Nova requisição (Ctrl+T)">
        ＋
      </button>
      <span className="hint tabs-hint">Dica: arraste as abas dos painéis para reorganizar e as bordas para redimensionar</span>
    </div>
  );
}
