import { useRef, useState, type DragEvent } from 'react';
import { useContextMenu } from '../../hooks/useContextMenu';
import type { WorkspaceActions } from '../../hooks/useWorkspace';
import { groupRequestsByTag } from '../../lib/apiEndpoints';
import { methodClass, methodShort } from '../../lib/format';
import { reorderTree, requestsInTreeOrder, treeChildren, type TreeDragNode, type TreeDropTarget, type TreeNode } from '../../lib/tree';
import type { Collection, Folder, SavedRequest } from '../../types';
import { ContextMenu } from '../common/ContextMenu';
import { Icon } from '../common/Icon';
import { InlineInput } from '../common/InlineInput';
import {
  CollectionMenu,
  FolderMenu,
  RequestMenu,
  TreeBackgroundMenu,
  UngroupedMenu,
  type TreeCommands,
  type TreeEdit,
} from './CollectionsTreeMenus';

type Editing = TreeEdit | null;

type DropZone = 'before' | 'after' | 'into';

type MenuTarget =
  | { kind: 'request' | 'collection' | 'folder'; id: string }
  | { kind: 'ungrouped' }
  | { kind: 'background' };

interface CollectionsTreeProps {
  collections: Collection[];
  folders: Folder[];
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

export function CollectionsTree({ collections, folders, requests, activeRequestId, actions, commands }: CollectionsTreeProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const { menu, openAt, openBelow, close } = useContextMenu<MenuTarget>();
  const dragged = useRef<TreeDragNode | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; zone: DropZone } | null>(null);

  const term = search.trim().toLowerCase();
  const visible = requests.filter((r) => matches(r, term));
  const orphans = visible.filter((r) => !r.collectionId);

  const isEditing = (kind: 'request' | 'collection' | 'baseUrl' | 'folder' | 'folderBaseUrl', id: string) =>
    editing !== null && editing.kind === kind && 'id' in editing && editing.id === id;

  const canDrag = !term && editing === null;

  const dragProps = (node: TreeDragNode) => ({
    draggable: canDrag,
    onDragStart: (event: DragEvent) => {
      dragged.current = node;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', node.id);
    },
    onDragEnd: () => {
      dragged.current = null;
      setDropHint(null);
    },
  });

  const zoneAt = (event: DragEvent, zones: DropZone[]): DropZone => {
    if (zones.length === 1) return zones[0];
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    if (zones.includes('into') && ratio >= 0.25 && ratio <= 0.75) return 'into';
    return ratio < 0.5 ? 'before' : 'after';
  };

  const dropProps = (id: string, zones: DropZone[], targetFor: (zone: DropZone) => TreeDropTarget) => {
    const validTarget = (event: DragEvent) => {
      if (!dragged.current || term) return null;
      const zone = zoneAt(event, zones);
      const target = targetFor(zone);
      return reorderTree(folders, requests, dragged.current, target) ? { zone, target } : null;
    };
    return {
      onDragOver: (event: DragEvent) => {
        const valid = validTarget(event);
        if (!valid) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropHint((hint) => (hint?.id === id && hint.zone === valid.zone ? hint : { id, zone: valid.zone }));
      },
      onDragLeave: () => setDropHint((hint) => (hint?.id === id ? null : hint)),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        const valid = validTarget(event);
        if (valid && dragged.current) actions.reorderTree(dragged.current, valid.target);
        dragged.current = null;
        setDropHint(null);
      },
    };
  };

  const dropClass = (id: string) => (dropHint?.id === id ? ` drop-${dropHint.zone}` : '');

  const renderRequest = (request: SavedRequest, reorderable = true) => {
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
        className={'tree-item' + (request.id === activeRequestId ? ' selected' : '') + dropClass(request.id)}
        title={`${request.method} ${request.url}`}
        {...(reorderable && dragProps({ kind: 'request', id: request.id }))}
        {...(reorderable &&
          dropProps(request.id, ['before', 'after'], (zone) => ({
            collectionId: request.collectionId ?? null,
            parentId: request.folderId ?? null,
            anchorId: request.id,
            after: zone === 'after',
          })))}
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

  const renderFolder = (folder: Folder) => {
    const count = requestsInTreeOrder(folder.collectionId, folder.id, folders, visible).length;
    if (term && count === 0) return null;
    const expanded = !folder.collapsed || Boolean(term);
    const children = treeChildren(folder.collectionId, folder.id, folders, visible);

    return (
      <div key={folder.id} className="tree-group">
        <div
          className={'tree-head folder' + dropClass(folder.id)}
          {...dragProps({ kind: 'folder', id: folder.id })}
          {...dropProps(folder.id, ['before', 'into', 'after'], (zone) =>
            zone === 'into'
              ? { collectionId: folder.collectionId, parentId: folder.id, anchorId: null, after: false }
              : { collectionId: folder.collectionId, parentId: folder.parentId, anchorId: folder.id, after: zone === 'after' }
          )}
          onClick={() => actions.setFolderCollapsed(folder.id, !folder.collapsed)}
          onContextMenu={(event) => openAt(event, { kind: 'folder', id: folder.id })}
        >
          <Icon name="chevron" size={12} className={'tree-chevron' + (expanded ? ' open' : '')} />
          <Icon name={expanded ? 'folder-open' : 'folder'} className="tree-folder" />
          {isEditing('folder', folder.id) ? (
            <InlineInput
              className="tree-input"
              initialValue={folder.name}
              ariaLabel="Renomear pasta"
              onCommit={(value) => {
                actions.renameFolder(folder.id, value);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <span
              className="tree-label"
              title={folder.name}
              onDoubleClick={(event) => {
                event.stopPropagation();
                setEditing({ kind: 'folder', id: folder.id });
              }}
            >
              {folder.name}
            </span>
          )}
          <span className="tree-count">{count}</span>
          <button
            className="tree-more"
            onClick={(event) => openBelow(event, { kind: 'folder', id: folder.id })}
            aria-label={`Opções da pasta ${folder.name}`}
          >
            ⋯
          </button>
        </div>

        {isEditing('folderBaseUrl', folder.id) ? (
          <InlineInput
            className="tree-input base-url-input"
            initialValue={folder.baseUrl}
            placeholder="https://api.exemplo.com"
            ariaLabel="URL base da pasta"
            onCommit={(value) => {
              actions.setFolderBaseUrl(folder.id, value);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          folder.baseUrl && <div className="tree-base-url">{folder.baseUrl}</div>
        )}

        {expanded && (
          <div className="tree-children">
            {children.map(renderNode)}
            {children.length === 0 && <div className="tree-empty">Pasta vazia</div>}
          </div>
        )}
      </div>
    );
  };

  const renderTagGroups = (collection: Collection) => {
    const groups = groupRequestsByTag(requestsInTreeOrder(collection.id, null, folders, visible));
    if (groups.length === 0) return <div className="tree-empty">Coleção vazia</div>;

    return groups.map((group) => {
      const expanded = Boolean(term) || !collection.collapsedGroups?.includes(group.tag);
      const toggle = () => actions.toggleCollectionGroup(collection.id, group.tag);
      return (
        <div key={`tag:${group.tag}`} className="tree-group">
          <div
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            className="tree-head tag-group"
            title={`Grupo ${group.tag}`}
            onClick={toggle}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle();
              }
            }}
          >
            <Icon name="chevron" size={12} className={'tree-chevron' + (expanded ? ' open' : '')} />
            <Icon name="tag" className="tree-folder" />
            <span className="tree-label">{group.tag}</span>
            <span className="tree-count">{group.requests.length}</span>
          </div>
          {expanded && <div className="tree-children">{group.requests.map((request) => renderRequest(request, false))}</div>}
        </div>
      );
    });
  };

  const renderNode = (node: TreeNode) => (node.kind === 'folder' ? renderFolder(node.folder) : renderRequest(node.request));

  const menuContext = { actions, commands, onEdit: setEditing };

  const renderMenu = (target: MenuTarget) => {
    switch (target.kind) {
      case 'request': {
        const request = requests.find((r) => r.id === target.id);
        return request && <RequestMenu request={request} collections={collections} folders={folders} {...menuContext} />;
      }
      case 'collection': {
        const collection = collections.find((c) => c.id === target.id);
        return collection && <CollectionMenu collection={collection} {...menuContext} />;
      }
      case 'folder': {
        const folder = folders.find((f) => f.id === target.id);
        return folder && <FolderMenu folder={folder} folders={folders} {...menuContext} />;
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
          const nodes = treeChildren(collection.id, null, folders, visible);

          return (
            <div key={collection.id} className="tree-group">
              <div
                className={'tree-head' + dropClass(collection.id)}
                {...dropProps(collection.id, ['into'], () => ({
                  collectionId: collection.id,
                  parentId: null,
                  anchorId: null,
                  after: false,
                }))}
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
                    actions.setCollectionBaseUrl(collection.id, value);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                collection.baseUrl && <div className="tree-base-url">{collection.baseUrl}</div>
              )}

              {expanded && (
                <div className="tree-children">
                  {collection.groupByTag ? (
                    renderTagGroups(collection)
                  ) : (
                    <>
                      {nodes.map(renderNode)}
                      {nodes.length === 0 && <div className="tree-empty">Coleção vazia</div>}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {orphans.length > 0 && (
          <div className="tree-group">
            <div
              className={'tree-head static' + dropClass('ungrouped')}
              {...dropProps('ungrouped', ['into'], () => ({ collectionId: null, parentId: null, anchorId: null, after: false }))}
              onContextMenu={(event) => openAt(event, { kind: 'ungrouped' })}
            >
              <Icon name="chevron" size={12} className="tree-chevron open" />
              <Icon name="tray" className="tree-folder" />
              <span className="tree-label muted">Sem grupo</span>
              <span className="tree-count">{orphans.length}</span>
            </div>
            {treeChildren(null, null, folders, orphans).map(renderNode)}
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
