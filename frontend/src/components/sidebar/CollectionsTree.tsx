import { useState } from 'react';
import { useContextMenu } from '../../hooks/useContextMenu';
import type { WorkspaceActions } from '../../hooks/useWorkspace';
import { methodClass, methodShort } from '../../lib/format';
import type { Collection, SavedRequest } from '../../types';
import { ContextMenu } from '../common/ContextMenu';
import { Icon } from '../common/Icon';
import { InlineInput } from '../common/InlineInput';
import {
  CollectionMenu,
  RequestMenu,
  TreeBackgroundMenu,
  UngroupedMenu,
  type TreeCommands,
  type TreeEdit,
} from './CollectionsTreeMenus';

type Editing = TreeEdit | null;

/** Sobre o que o menu de contexto foi aberto. */
type MenuTarget =
  | { kind: 'request' | 'collection'; id: string }
  | { kind: 'ungrouped' }
  | { kind: 'background' };

interface CollectionsTreeProps {
  collections: Collection[];
  requests: SavedRequest[];
  activeRequestId: string | null;
  actions: WorkspaceActions;
  commands: TreeCommands;
}

function matches(request: SavedRequest, term: string) {
  return (
    !term ||
    request.title.toLowerCase().includes(term) ||
    request.url.toLowerCase().includes(term) ||
    request.method.toLowerCase().includes(term)
  );
}

export function CollectionsTree({ collections, requests, activeRequestId, actions, commands }: CollectionsTreeProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const { menu, openAt, openBelow, close } = useContextMenu<MenuTarget>();

  const term = search.trim().toLowerCase();
  const visible = requests.filter((r) => matches(r, term));
  const orphans = visible.filter((r) => !r.collectionId);

  const isEditing = (kind: 'request' | 'collection' | 'baseUrl', id: string) =>
    editing !== null && editing.kind === kind && 'id' in editing && editing.id === id;

  const renderRequest = (request: SavedRequest) => {
    if (isEditing('request', request.id)) {
      return (
        <InlineInput
          key={request.id}
          className="tree-input"
          initialValue={request.title}
          ariaLabel="Renomear requisição"
          onCommit={(value) => {
            if (value.trim()) actions.updateRequest(request.id, { title: value.trim() });
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      );
    }

    return (
      <div
        key={request.id}
        role="button"
        tabIndex={0}
        className={'tree-item' + (request.id === activeRequestId ? ' selected' : '')}
        title={`${request.method} ${request.url}`}
        onClick={() => actions.openTab(request.id)}
        onDoubleClick={() => setEditing({ kind: 'request', id: request.id })}
        onContextMenu={(event) => openAt(event, { kind: 'request', id: request.id })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') actions.openTab(request.id);
          if (event.key === 'F2') setEditing({ kind: 'request', id: request.id });
        }}
      >
        <span className={methodClass(request.method)}>{methodShort(request.method)}</span>
        <span className="tree-label">{request.title}</span>
        <button
          className="tree-more"
          onClick={(event) => openBelow(event, { kind: 'request', id: request.id })}
          aria-label={`Opções de ${request.title}`}
        >
          ⋯
        </button>
      </div>
    );
  };

  const menuContext = { actions, commands, onEdit: setEditing };

  const renderMenu = (target: MenuTarget) => {
    switch (target.kind) {
      case 'request': {
        const request = requests.find((r) => r.id === target.id);
        return request && <RequestMenu request={request} collections={collections} {...menuContext} />;
      }
      case 'collection': {
        const collection = collections.find((c) => c.id === target.id);
        return collection && <CollectionMenu collection={collection} {...menuContext} />;
      }
      case 'ungrouped':
        return <UngroupedMenu actions={actions} commands={commands} />;
      case 'background':
        return <TreeBackgroundMenu collections={collections} {...menuContext} />;
    }
  };

  return (
    <>
      <div className="side-tools">
        <input
          placeholder="⌕  Buscar em coleções..."
          aria-label="Buscar em coleções"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button title="Nova coleção" aria-label="Nova coleção" onClick={() => setEditing({ kind: 'newCollection' })}>
          ＋
        </button>
      </div>

      <div
        className="tree"
        onContextMenu={(event) => {
          // Em campos de texto (renomear, nova coleção) fica o menu nativo de copiar/colar.
          if ((event.target as HTMLElement).closest('input, textarea')) return;
          openAt(event, { kind: 'background' });
        }}
      >
        {editing?.kind === 'newCollection' && (
          <InlineInput
            className="tree-input"
            placeholder="Nome da coleção"
            ariaLabel="Nome da nova coleção"
            commitOnBlur={false}
            onCommit={(value) => {
              actions.createCollection(value);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}

        {collections.map((collection) => {
          const items = visible.filter((r) => r.collectionId === collection.id);
          if (term && items.length === 0) return null;
          const expanded = !collection.collapsed || Boolean(term);

          return (
            <div key={collection.id} className="tree-group">
              <div
                className="tree-head"
                onClick={() => actions.setCollectionCollapsed(collection.id, !collection.collapsed)}
                onContextMenu={(event) => openAt(event, { kind: 'collection', id: collection.id })}
              >
                <Icon name="chevron" size={12} className={'tree-chevron' + (expanded ? ' open' : '')} />
                <Icon name={expanded ? 'folder-open' : 'folder'} className="tree-folder" />
                {isEditing('collection', collection.id) ? (
                  <InlineInput
                    className="tree-input"
                    initialValue={collection.name}
                    ariaLabel="Renomear coleção"
                    onCommit={(value) => {
                      actions.renameCollection(collection.id, value);
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <span
                    className="tree-label"
                    title={collection.name}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      setEditing({ kind: 'collection', id: collection.id });
                    }}
                  >
                    {collection.name}
                  </span>
                )}
                <span className="tree-count">{items.length}</span>
                <button
                  className="tree-more"
                  onClick={(event) => openBelow(event, { kind: 'collection', id: collection.id })}
                  aria-label={`Opções da coleção ${collection.name}`}
                >
                  ⋯
                </button>
              </div>

              {isEditing('baseUrl', collection.id) ? (
                <InlineInput
                  className="tree-input base-url-input"
                  initialValue={collection.baseUrl}
                  placeholder="https://api.exemplo.com"
                  ariaLabel="URL base da coleção"
                  onCommit={(value) => {
                    // URL base pode ser apagada (voltar a não ter prefixo).
                    actions.setCollectionBaseUrl(collection.id, value);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                collection.baseUrl && <div className="tree-base-url">{collection.baseUrl}</div>
              )}

              {expanded && (
                <>
                  {items.map(renderRequest)}
                  {items.length === 0 && <div className="tree-empty">Coleção vazia</div>}
                </>
              )}
            </div>
          );
        })}

        {orphans.length > 0 && (
          <div className="tree-group">
            <div className="tree-head static" onContextMenu={(event) => openAt(event, { kind: 'ungrouped' })}>
              <Icon name="chevron" size={12} className="tree-chevron open" />
              <Icon name="tray" className="tree-folder" />
              <span className="tree-label muted">Sem grupo</span>
              <span className="tree-count">{orphans.length}</span>
            </div>
            {orphans.map(renderRequest)}
          </div>
        )}

        {term && visible.length === 0 && <div className="tree-empty">Nada encontrado para "{search}".</div>}
        {!term && collections.length === 0 && requests.length === 0 && (
          <div className="tree-empty">Nenhuma coleção ainda.</div>
        )}
      </div>

      <div className="side-bottom">
        <button onClick={() => setEditing({ kind: 'newCollection' })}>＋ Nova Coleção</button>
      </div>

      {menu && (
        <ContextMenu position={menu.position} onClose={close}>
          {renderMenu(menu.target)}
        </ContextMenu>
      )}
    </>
  );
}
