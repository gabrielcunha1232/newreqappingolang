import type { DocsScope } from '../../lib/apiDocsScope';
import type { SavedRequest } from '../../types';
import { MenuItem, MenuSeparator } from '../common/ContextMenu';
import type { DocsTabsProps, RequestTabsProps } from './WorkspaceTabsBar';

function idsAfter<T>(items: T[], getId: (item: T) => string, id: string): string[] {
  const index = items.findIndex((item) => getId(item) === id);
  return index === -1 ? [] : items.slice(index + 1).map(getId);
}

export function RequestTabMenu({ tab, tabs }: { tab: SavedRequest; tabs: RequestTabsProps }) {
  const others = tabs.open.filter((t) => t.id !== tab.id).map((t) => t.id);
  const toRight = idsAfter(tabs.open, (t) => t.id, tab.id);

  return (
    <>
      <MenuItem shortcut="Ctrl+W" onSelect={() => tabs.onClose(tab.id)}>
        Fechar
      </MenuItem>
      <MenuItem disabled={others.length === 0} onSelect={() => tabs.onCloseMany(others)}>
        Fechar outras
      </MenuItem>
      <MenuItem disabled={toRight.length === 0} onSelect={() => tabs.onCloseMany(toRight)}>
        Fechar à direita
      </MenuItem>
      <MenuItem onSelect={() => tabs.onCloseMany(tabs.open.map((t) => t.id))}>Fechar todas</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => tabs.onDuplicate(tab.id)}>Duplicar</MenuItem>
      <MenuItem onSelect={() => tabs.onCopyCurl(tab.id)}>Copiar como cURL</MenuItem>
      <MenuItem onSelect={() => tabs.onGenerateCode(tab.id)}>Gerar código…</MenuItem>
      <MenuItem onSelect={() => tabs.onShowDocs(tab)}>Ver na documentação</MenuItem>
    </>
  );
}

export function DocsTabMenu({ scope, docs }: { scope: DocsScope; docs: DocsTabsProps }) {
  const others = docs.open.filter((s) => s.id !== scope.id).map((s) => s.id);

  return (
    <>
      <MenuItem shortcut="Ctrl+W" onSelect={() => docs.onClose(scope.id)}>
        Fechar
      </MenuItem>
      <MenuItem disabled={others.length === 0} onSelect={() => docs.onCloseMany(others)}>
        Fechar outras documentações
      </MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => docs.onExport(scope)}>Exportar OpenAPI</MenuItem>
    </>
  );
}
