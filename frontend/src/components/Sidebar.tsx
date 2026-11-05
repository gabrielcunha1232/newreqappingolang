import {
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { Collection, Tab } from '../types';

type View = 'client' | 'scanner' | 'history';

type OpenMenu = { type: 'tab' | 'collection'; id: string; x: number; y: number };

interface SidebarProps {
  view: View;
  onViewChange: (view: View) => void;
  onAddTab: (collectionId?: string | null) => void;
  collections: Collection[];
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabRename: (id: string, title: string) => void;
  onMoveTab: (tabId: string, collectionId: string | null) => void;
  onAddCollection: (name: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
  onToggleCollection: (id: string) => void;
}

const navItems: Array<{ view: View; label: string; icon: string }> = [
  { view: 'client', label: 'Cliente HTTP', icon: '⌘' },
  { view: 'scanner', label: 'Scanner de Endpoints', icon: '🔍' },
  { view: 'history', label: 'Histórico', icon: '🕒' },
];

const MENU_WIDTH = 210;
const MENU_HEIGHT = 280;

export function Sidebar({
  view,
  onViewChange,
  onAddTab,
  collections,
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabRename,
  onMoveTab,
  onAddCollection,
  onRenameCollection,
  onDeleteCollection,
  onToggleCollection,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);

  const orphanTabs = tabs.filter((t) => !t.collectionId);

  const openMenuAt = (event: ReactMouseEvent<HTMLElement>, type: OpenMenu['type'], id: string) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
    const below = rect.bottom + 6;
    const y =
      below + MENU_HEIGHT > window.innerHeight
        ? Math.max(8, rect.top - MENU_HEIGHT - 6)
        : below;
    setOpenMenu((prev) =>
      prev && prev.type === type && prev.id === id ? null : { type, id, x, y }
    );
  };

  const startRenameTab = (tab: Tab) => {
    setEditingTabId(tab.id);
    setDraft(tab.title);
  };

  const startRenameCollection = (collection: Collection) => {
    setEditingCollectionId(collection.id);
    setDraft(collection.name);
  };

  const commitRename = () => {
    if (editingTabId !== null) {
      const value = draft.trim();
      if (value) onTabRename(editingTabId, value);
      setEditingTabId(null);
      return;
    }
    if (editingCollectionId !== null) {
      const value = draft.trim();
      if (value) onRenameCollection(editingCollectionId, value);
      setEditingCollectionId(null);
    }
  };

  const cancelRename = () => {
    setEditingTabId(null);
    setEditingCollectionId(null);
    setCreatingCollection(false);
  };

  const handleRenameKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (creatingCollection) {
        const value = draft.trim();
        if (value) onAddCollection(value);
        setCreatingCollection(false);
        setDraft('');
        return;
      }
      commitRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancelRename();
      setDraft('');
    }
  };

  const selectTab = (id: string) => {
    onTabClick(id);
    onViewChange('client');
  };

  const renderTab = (tab: Tab) => {
    if (editingTabId === tab.id) {
      return (
        <input
          key={tab.id}
          className="sidebar-tab-input"
          value={draft}
          autoFocus
          onFocus={(event) => event.target.select()}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={handleRenameKey}
          aria-label="Renomear requisição"
        />
      );
    }

    const menuAberto = openMenu?.type === 'tab' && openMenu.id === tab.id;

    return (
      <div
        key={tab.id}
        role="button"
        tabIndex={0}
        className={`sidebar-tab ${tab.id === activeTabId ? 'active' : ''}`}
        onClick={() => selectTab(tab.id)}
        onDoubleClick={() => startRenameTab(tab)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            selectTab(tab.id);
          }
        }}
        title={`${tab.method} ${tab.url}`}
        aria-current={tab.id === activeTabId}
      >
        <span className={`sidebar-tab-method method-${tab.method.toUpperCase()}`}>
          {tab.method}
        </span>
        {!collapsed && <span className="sidebar-tab-name">{tab.title}</span>}
        {!collapsed && (
          <button
            className="sidebar-tab-more"
            onClick={(event) => openMenuAt(event, 'tab', tab.id)}
            aria-label={`Opções de ${tab.title}`}
          >
            ⋯
          </button>
        )}
        <button
          className="sidebar-tab-close"
          onClick={(event) => {
            event.stopPropagation();
            onTabClose(tab.id);
          }}
          aria-label={`Fechar aba ${tab.title}`}
        >
          ×
        </button>
        {menuAberto && renderTabMenu(tab)}
      </div>
    );
  };

  const renderTabMenu = (tab: Tab) => (
    <div className="tab-menu" style={{ left: openMenu!.x, top: openMenu!.y }}>
      <div className="tab-menu-label">Mover para</div>
      {collections.length === 0 && (
        <div className="tab-menu-empty">Nenhuma coleção ainda</div>
      )}
      {collections.map((collection) => (
        <button
          key={collection.id}
          className={`tab-menu-item ${tab.collectionId === collection.id ? 'selected' : ''}`}
          onClick={() => {
            onMoveTab(tab.id, collection.id);
            setOpenMenu(null);
          }}
        >
          <span className="tab-menu-text">{collection.name}</span>
          {tab.collectionId === collection.id && <span aria-hidden="true">✓</span>}
        </button>
      ))}
      <button
        className={`tab-menu-item ${!tab.collectionId ? 'selected' : ''}`}
        onClick={() => {
          onMoveTab(tab.id, null);
          setOpenMenu(null);
        }}
      >
        <span className="tab-menu-text">Sem grupo</span>
        {!tab.collectionId && <span aria-hidden="true">✓</span>}
      </button>
      <div className="tab-menu-sep" />
      <button
        className="tab-menu-item"
        onClick={() => {
          setOpenMenu(null);
          startRenameTab(tab);
        }}
      >
        Renomear
      </button>
      <button
        className="tab-menu-item danger"
        onClick={() => {
          setOpenMenu(null);
          onTabClose(tab.id);
        }}
      >
        Excluir
      </button>
    </div>
  );

  const renderCollectionMenu = (collection: Collection) => (
    <>
      <div className="tab-menu-label">Coleção</div>
      <button
        className="tab-menu-item"
        onClick={() => {
          onAddTab(collection.id);
          setOpenMenu(null);
        }}
      >
        Nova requisição aqui
      </button>
      <button
        className="tab-menu-item"
        onClick={() => {
          setOpenMenu(null);
          startRenameCollection(collection);
        }}
      >
        Renomear
      </button>
      <div className="tab-menu-sep" />
      <button
        className="tab-menu-item danger"
        onClick={() => {
          onDeleteCollection(collection.id);
          setOpenMenu(null);
        }}
      >
        Excluir coleção
      </button>
    </>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div
          className="sidebar-logo"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          <div className="logo-mark">N</div>
          {!collapsed && <span className="logo-text">NewPostman</span>}
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.view}
              className={`nav-item ${view === item.view ? 'active' : ''}`}
              onClick={() => onViewChange(item.view)}
              aria-label={item.label}
            >
              <span aria-hidden="true">{item.icon}</span>
              {!collapsed && item.label}
            </button>
          ))}
        </nav>

        <div className="nav-divider" />

        <div className="sidebar-tabs">
          <div className="sidebar-tabs-header">
            {!collapsed && <span className="sidebar-tabs-title">Coleções</span>}
            <button
              className="sidebar-tabs-add"
              onClick={() => {
                setDraft('');
                setCreatingCollection(true);
              }}
              title="Nova coleção"
              aria-label="Nova coleção"
            >
              +
            </button>
          </div>

          {creatingCollection && (
            <input
              className="sidebar-tab-input"
              placeholder="Nome da coleção"
              value={draft}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                setCreatingCollection(false);
                setDraft('');
              }}
              onKeyDown={handleRenameKey}
              aria-label="Nome da nova coleção"
            />
          )}

          <div className="sidebar-tabs-list">
            {collections.map((collection) => {
              const collectionTabs = tabs.filter((t) => t.collectionId === collection.id);
              const renomeando = editingCollectionId === collection.id;
              const menuAberto =
                openMenu?.type === 'collection' && openMenu.id === collection.id;

              return (
                <div className="collection" key={collection.id}>
                  <div className="collection-row">
                    <button
                      className="collection-chevron"
                      onClick={() => onToggleCollection(collection.id)}
                      aria-label={
                        collection.collapsed ? 'Expandir coleção' : 'Recolher coleção'
                      }
                    >
                      {collection.collapsed ? '▸' : '▾'}
                    </button>

                    {renomeando ? (
                      <input
                        className="sidebar-tab-input collection-input"
                        value={draft}
                        autoFocus
                        onFocus={(event) => event.target.select()}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={handleRenameKey}
                        aria-label="Renomear coleção"
                      />
                    ) : (
                      <span
                        className="collection-name"
                        onDoubleClick={() => startRenameCollection(collection)}
                        title={collection.name}
                      >
                        {collection.name}
                      </span>
                    )}

                    <span className="collection-count">{collectionTabs.length}</span>
                    <button
                      className="sidebar-tab-more"
                      onClick={(event) => openMenuAt(event, 'collection', collection.id)}
                      aria-label={`Opções da coleção ${collection.name}`}
                    >
                      ⋯
                    </button>

                    {menuAberto && (
                      <div
                        className="tab-menu"
                        style={{ left: openMenu!.x, top: openMenu!.y }}
                      >
                        {renderCollectionMenu(collection)}
                      </div>
                    )}
                  </div>

                  {!collection.collapsed && (
                    <div className="collection-body">
                      {collectionTabs.map(renderTab)}
                      {collectionTabs.length === 0 && (
                        <div className="collection-empty">Coleção vazia</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {orphanTabs.length > 0 && (
              <div className="collection">
                <div className="collection-row static">
                  <span className="collection-name muted">Sem grupo</span>
                  <span className="collection-count">{orphanTabs.length}</span>
                </div>
                <div className="collection-body">{orphanTabs.map(renderTab)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="new-request-btn" onClick={() => onAddTab()} title="Nova requisição">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {!collapsed && 'Nova requisição'}
          </button>
        </div>
      </div>

      {openMenu && (
        <div className="menu-backdrop" onClick={() => setOpenMenu(null)} />
      )}
    </aside>
  );
}
