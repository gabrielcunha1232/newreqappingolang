import type { WorkspaceActions } from '../../hooks/useWorkspace';
import type { Collection, SavedRequest } from '../../types';
import { MenuItem, MenuLabel, MenuSeparator } from '../common/ContextMenu';

/** Ações da árvore que dependem de outras partes do app (docs, cURL, área de transferência...). */
export interface TreeCommands {
  showDocs: (collectionId: string | null, requestId?: string) => void;
  exportOpenApi: (collectionId: string | null) => void;
  copyCurl: (requestId: string) => void;
  copyText: (text: string, label: string) => void;
  importSpec: () => void;
  importCurl: () => void;
}

/** Edição inline que um item de menu pode iniciar. */
export type TreeEdit =
  | { kind: 'request' | 'collection' | 'baseUrl'; id: string }
  | { kind: 'newCollection' };

interface MenuContext {
  actions: WorkspaceActions;
  commands: TreeCommands;
  onEdit: (edit: TreeEdit) => void;
}

export function RequestMenu({
  request,
  collections,
  actions,
  commands,
  onEdit,
}: MenuContext & { request: SavedRequest; collections: Collection[] }) {
  return (
    <>
      <MenuItem onSelect={() => actions.openTab(request.id)}>Abrir</MenuItem>
      <MenuItem onSelect={() => commands.showDocs(request.collectionId, request.id)}>Ver na documentação</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => commands.copyCurl(request.id)}>Copiar como cURL</MenuItem>
      <MenuItem onSelect={() => commands.copyText(request.url, 'URL')}>Copiar URL</MenuItem>
      <MenuSeparator />
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
      <MenuItem onSelect={() => commands.showDocs(collection.id)}>Ver documentação</MenuItem>
      <MenuItem onSelect={() => commands.exportOpenApi(collection.id)}>Exportar OpenAPI</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => onEdit({ kind: 'collection', id: collection.id })}>Renomear</MenuItem>
      <MenuItem onSelect={() => onEdit({ kind: 'baseUrl', id: collection.id })}>Definir URL base</MenuItem>
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

/** Grupo "Sem grupo" (requisições fora de coleções). */
export function UngroupedMenu({ actions, commands }: Omit<MenuContext, 'onEdit'>) {
  return (
    <>
      <MenuLabel>Sem grupo</MenuLabel>
      <MenuItem onSelect={() => actions.createRequest(null)}>Nova requisição aqui</MenuItem>
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
