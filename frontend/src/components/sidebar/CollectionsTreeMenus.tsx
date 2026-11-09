import { Fragment } from 'react';
import type { WorkspaceActions } from '../../hooks/useWorkspace';
import { descendantFolderIds, folderPath } from '../../lib/tree';
import type { Collection, Folder, SavedRequest } from '../../types';
import { MenuItem, MenuLabel, MenuSeparator } from '../common/ContextMenu';

/** Ações da árvore que dependem de outras partes do app (docs, cURL, área de transferência...). */
export interface TreeCommands {
  showDocs: (collectionId: string | null, requestId?: string) => void;
  exportOpenApi: (collectionId: string | null) => void;
  exportPostman: (collectionId: string) => void;
  copyCurl: (requestId: string) => void;
  generateCode: (requestId: string) => void;
  compareEnvironments: (requestId: string) => void;
  runCollection: (collectionId: string | null, folderId?: string | null) => void;
  configureAuth: (target: { kind: 'folder' | 'collection'; id: string }) => void;
  importCollection: () => void;
  copyText: (text: string, label: string) => void;
  importSpec: () => void;
  importCurl: () => void;
}

/** Edição inline que um item de menu pode iniciar. */
export type TreeEdit =
  | { kind: 'request' | 'collection' | 'baseUrl' | 'folder' | 'folderBaseUrl'; id: string }
  | { kind: 'newCollection' };

interface MenuContext {
  actions: WorkspaceActions;
  commands: TreeCommands;
  onEdit: (edit: TreeEdit) => void;
}

export function RequestMenu({
  request,
  collections,
  folders,
  actions,
  commands,
  onEdit,
}: MenuContext & { request: SavedRequest; collections: Collection[]; folders: Folder[] }) {
  return (
    <>
      <MenuItem onSelect={() => actions.openTab(request.id)}>Abrir</MenuItem>
      <MenuItem onSelect={() => commands.showDocs(request.collectionId, request.id)}>Ver na documentação</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => commands.copyCurl(request.id)}>Copiar como cURL</MenuItem>
      <MenuItem onSelect={() => commands.generateCode(request.id)}>Gerar código…</MenuItem>
      <MenuItem onSelect={() => commands.compareEnvironments(request.id)}>Comparar ambientes…</MenuItem>
      <MenuItem onSelect={() => commands.copyText(request.url, 'URL')}>Copiar URL</MenuItem>
      <MenuSeparator />
      <MenuLabel>Mover para</MenuLabel>
      {collections.map((collection) => (
        <Fragment key={collection.id}>
          <MenuItem
            checked={request.collectionId === collection.id && !request.folderId}
            onSelect={() => actions.moveRequest(request.id, collection.id)}
          >
            {collection.name}
          </MenuItem>
          {folders
            .filter((folder) => folder.collectionId === collection.id)
            .map((folder) => (
              <MenuItem
                key={folder.id}
                checked={request.folderId === folder.id}
                onSelect={() => actions.moveRequest(request.id, collection.id, folder.id)}
              >
                {`${collection.name} / ${folderPath(folder, folders)}`}
              </MenuItem>
            ))}
        </Fragment>
      ))}
      <MenuItem checked={!request.collectionId} onSelect={() => actions.moveRequest(request.id, null)}>
        Sem grupo
      </MenuItem>
      <MenuSeparator />
      <MenuItem shortcut="F2" onSelect={() => onEdit({ kind: 'request', id: request.id })}>
        Renomear
      </MenuItem>
      <MenuItem onSelect={() => actions.duplicateRequest(request.id)}>Duplicar</MenuItem>
      <MenuItem danger onSelect={() => actions.deleteRequest(request.id)}>
        Excluir
      </MenuItem>
    </>
  );
}

export function CollectionMenu({ collection, actions, commands, onEdit }: MenuContext & { collection: Collection }) {
  return (
    <>
      <MenuLabel>{collection.name}</MenuLabel>
      <MenuItem onSelect={() => actions.createRequest(collection.id)}>Nova requisição aqui</MenuItem>
      <MenuItem onSelect={() => onEdit({ kind: 'folder', id: actions.createFolder(collection.id, null) })}>Nova pasta</MenuItem>
      <MenuItem onSelect={() => commands.runCollection(collection.id)}>Executar coleção…</MenuItem>
      <MenuItem onSelect={() => commands.showDocs(collection.id)}>Ver documentação</MenuItem>
      <MenuItem onSelect={() => commands.exportOpenApi(collection.id)}>Exportar OpenAPI</MenuItem>
      <MenuItem onSelect={() => commands.exportPostman(collection.id)}>Exportar para Postman</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => onEdit({ kind: 'collection', id: collection.id })}>Renomear</MenuItem>
      <MenuItem onSelect={() => onEdit({ kind: 'baseUrl', id: collection.id })}>Definir URL base</MenuItem>
      <MenuItem onSelect={() => commands.configureAuth({ kind: 'collection', id: collection.id })}>Autorização…</MenuItem>
      {collection.baseUrl && (
        <MenuItem onSelect={() => commands.copyText(collection.baseUrl, 'URL base')}>Copiar URL base</MenuItem>
      )}
      <MenuItem onSelect={() => actions.setCollectionCollapsed(collection.id, !collection.collapsed)}>
        {collection.collapsed ? 'Expandir' : 'Recolher'}
      </MenuItem>
      <MenuSeparator />
      <MenuItem danger onSelect={() => actions.deleteCollection(collection.id)}>
        Excluir coleção
      </MenuItem>
    </>
  );
}

export function FolderMenu({ folder, folders, actions, commands, onEdit }: MenuContext & { folder: Folder; folders: Folder[] }) {
  const blocked = descendantFolderIds(folder.id, folders);
  const targets = folders.filter((f) => f.collectionId === folder.collectionId && !blocked.has(f.id));

  return (
    <>
      <MenuLabel>{folder.name}</MenuLabel>
      <MenuItem onSelect={() => actions.createRequest(folder.collectionId, { folderId: folder.id })}>Nova requisição aqui</MenuItem>
      <MenuItem onSelect={() => onEdit({ kind: 'folder', id: actions.createFolder(folder.collectionId, folder.id) })}>
        Nova subpasta
      </MenuItem>
      <MenuItem onSelect={() => commands.runCollection(folder.collectionId, folder.id)}>Executar pasta…</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => onEdit({ kind: 'folder', id: folder.id })}>Renomear</MenuItem>
      <MenuItem onSelect={() => onEdit({ kind: 'folderBaseUrl', id: folder.id })}>Definir URL base</MenuItem>
      <MenuItem onSelect={() => commands.configureAuth({ kind: 'folder', id: folder.id })}>Autorização…</MenuItem>
      <MenuSeparator />
      <MenuLabel>Mover para</MenuLabel>
      <MenuItem checked={folder.parentId === null} onSelect={() => actions.moveFolder(folder.id, null)}>
        Raiz da coleção
      </MenuItem>
      {targets.map((target) => (
        <MenuItem key={target.id} checked={folder.parentId === target.id} onSelect={() => actions.moveFolder(folder.id, target.id)}>
          {folderPath(target, folders)}
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem danger onSelect={() => actions.deleteFolder(folder.id)}>
        Excluir pasta
      </MenuItem>
    </>
  );
}

/** Grupo "Sem grupo" (requisições fora de coleções). */
export function UngroupedMenu({ actions, commands }: Omit<MenuContext, 'onEdit'>) {
  return (
    <>
      <MenuLabel>Sem grupo</MenuLabel>
      <MenuItem onSelect={() => actions.createRequest(null)}>Nova requisição aqui</MenuItem>
      <MenuItem onSelect={() => commands.runCollection(null)}>Executar requisições…</MenuItem>
      <MenuItem onSelect={() => commands.showDocs(null)}>Ver documentação</MenuItem>
      <MenuItem onSelect={() => commands.exportOpenApi(null)}>Exportar OpenAPI</MenuItem>
    </>
  );
}

/** Clique direito na área vazia da árvore. */
export function TreeBackgroundMenu({
  collections,
  actions,
  commands,
  onEdit,
}: MenuContext & { collections: Collection[] }) {
  const setAllCollapsed = (collapsed: boolean) =>
    collections.forEach((collection) => actions.setCollectionCollapsed(collection.id, collapsed));

  return (
    <>
      <MenuItem shortcut="Ctrl+T" onSelect={() => actions.createRequest(null)}>
        Nova requisição
      </MenuItem>
      <MenuItem onSelect={() => onEdit({ kind: 'newCollection' })}>Nova coleção</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={commands.importSpec}>Importar OpenAPI / Swagger…</MenuItem>
      <MenuItem onSelect={commands.importCurl}>Importar cURL…</MenuItem>
      <MenuItem onSelect={commands.importCollection}>Importar Postman / Insomnia…</MenuItem>
      <MenuSeparator />
      <MenuItem disabled={collections.length === 0} onSelect={() => setAllCollapsed(false)}>
        Expandir todas
      </MenuItem>
      <MenuItem disabled={collections.length === 0} onSelect={() => setAllCollapsed(true)}>
        Recolher todas
      </MenuItem>
    </>
  );
}
