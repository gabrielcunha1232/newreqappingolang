import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { WorkspaceActions } from '../../hooks/useWorkspace';
import { methodClass, methodShort } from '../../lib/format';
import type { Collection, SavedRequest } from '../../types';
import {
  ContextMenu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  menuPositionFor,
  type MenuPosition,
} from '../common/ContextMenu';
import { InlineInput } from '../common/InlineInput';

type Editing =
  | { kind: 'request' | 'collection' | 'baseUrl'; id: string }
  | { kind: 'newCollection' }
  | null;

type OpenMenu = { kind: 'request' | 'collection'; id: string; position: MenuPosition } | null;

interface CollectionsTreeProps {
  collections: Collection[];
  requests: SavedRequest[];
  activeRequestId: string | null;
  actions: WorkspaceActions;
}

function matches(request: SavedRequest, term: string) {
  return (
    !term ||
    request.title.toLowerCase().includes(term) ||
    request.url.toLowerCase().includes(term) ||
    request.method.toLowerCase().includes(term)
  );
}

export function CollectionsTree({ collections, requests, activeRequestId, actions }: CollectionsTreeProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [menu, setMenu] = useState<OpenMenu>(null);

  const term = search.trim().toLowerCase();
  const visible = requests.filter((r) => matches(r, term));
  const orphans = visible.filter((r) => !r.collectionId);

  const openMenu = (event: ReactMouseEvent<HTMLElement>, kind: 'request' | 'collection', id: string) => {
    event.stopPropagation();
    setMenu(menu?.kind === kind && menu.id === id ? null : { kind, id, position: menuPositionFor(event) });
  };

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
        onKeyDown={(event) => {
          if (event.key === 'Enter') actions.openTab(request.id);
          if (event.key === 'F2') setEditing({ kind: 'request', id: request.id });
        }}
      >
        <span className={methodClass(request.method)}>{methodShort(request.method)}</span>
        <span className="tree-label">{request.title}</span>
        <button
          className="tree-more"
          onClick={(event) => openMenu(event, 'request', request.id)}
          aria-label={`Opções de ${request.title}`}
        >
          ⋯
        </button>
      </div>
    );
  };

  const renderRequestMenu = (request: SavedRequest) => (
    <>
      <MenuLabel>Mover para</MenuLabel>
      {collections.map((collection) => (
        <MenuItem
          key={collection.id}
          checked={request.collectionId === collection.id}
          onSelect={() => actions.moveRequest(request.id, collection.id)}
        >
          {collection.name}
        </MenuItem>
      ))}
      <MenuItem checked={!request.collectionId} onSelect={() => actions.moveRequest(request.id, null)}>
        Sem grupo
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => setEditing({ kind: 'request', id: request.id })}>Renomear</MenuItem>
      <MenuItem onSelect={() => actions.duplicateRequest(request.id)}>Duplicar</MenuItem>
      <MenuItem danger onSelect={() => actions.deleteRequest(request.id)}>
        Excluir
      </MenuItem>
    </>
  );

  const renderCollectionMenu = (collection: Collection) => (
    <>
      <MenuLabel>Coleção</MenuLabel>
      <MenuItem onSelect={() => actions.createRequest(collection.id)}>Nova requisição aqui</MenuItem>
      <MenuItem onSelect={() => setEditing({ kind: 'collection', id: collection.id })}>Renomear</MenuItem>
      <MenuItem onSelect={() => setEditing({ kind: 'baseUrl', id: collection.id })}>Definir URL base</MenuItem>
      <MenuSeparator />
      <MenuItem danger onSelect={() => actions.deleteCollection(collection.id)}>
        Excluir coleção
      </MenuItem>
    </>
  );

  const menuRequest = menu?.kind === 'request' ? requests.find((r) => r.id === menu.id) : undefined;
  const menuCollection = menu?.kind === 'collection' ? collections.find((c) => c.id === menu.id) : undefined;

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

      <div className="tree">
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
              >
                <span className="tree-chevron">{expanded ? '⌄' : '›'}</span>
                <span aria-hidden="true">📁</span>
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
                  onClick={(event) => openMenu(event, 'collection', collection.id)}
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
            <div className="tree-head static">
              <span className="tree-chevron">⌄</span>
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

      {menu && (menuRequest || menuCollection) && (
        <ContextMenu position={menu.position} onClose={() => setMenu(null)}>
          {menuRequest ? renderRequestMenu(menuRequest) : renderCollectionMenu(menuCollection!)}
        </ContextMenu>
      )}
    </>
  );
}
