import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { useContextMenu } from '../../hooks/useContextMenu';
import type { DocsScope } from '../../lib/apiDocsScope';
import { methodShort } from '../../lib/format';
import type { SavedRequest } from '../../types';
import { ContextMenu, MenuItem, MenuLabel, MenuSeparator } from '../common/ContextMenu';
import { WorkspaceTab, type DropSide } from './WorkspaceTab';
import { DocsTabMenu, RequestTabMenu } from './WorkspaceTabMenus';

export interface RequestTabsProps {
  open: SavedRequest[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onCloseMany: (ids: string[]) => void;
  onMove: (id: string, toIndex: number) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onCopyCurl: (id: string) => void;
  onGenerateCode: (id: string) => void;
  onShowDocs: (request: SavedRequest) => void;
}

export interface DocsTabsProps {
  open: DocsScope[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onCloseMany: (ids: string[]) => void;
  onExport: (scope: DocsScope) => void;
}

type TabTarget =
  | { kind: 'request'; tab: SavedRequest }
  | { kind: 'docs'; scope: DocsScope }
  | { kind: 'list' };

interface TabEntry {
  key: string;
  activate: () => void;
  close: () => void;
}

interface DropIndicator {
  id: string;
  side: DropSide;
}

interface WorkspaceTabsBarProps {
  requests: RequestTabsProps;
  docs: DocsTabsProps;
}

const docsKey = (id: string) => `docs:${id}`;
const requestKey = (id: string) => `req:${id}`;

export function WorkspaceTabsBar({ requests, docs }: WorkspaceTabsBarProps) {
  const showingDocs = docs.activeId !== null;
  const { menu, openAt, openBelow, close } = useContextMenu<TabTarget>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropIndicator | null>(null);

  const entries: TabEntry[] = [
    ...docs.open.map((scope) => ({
      key: docsKey(scope.id),
      activate: () => docs.onActivate(scope.id),
      close: () => docs.onClose(scope.id),
    })),
    ...requests.open.map((tab) => ({
      key: requestKey(tab.id),
      activate: () => requests.onActivate(tab.id),
      close: () => requests.onClose(tab.id),
    })),
  ];
  const activeKey = showingDocs
    ? docsKey(docs.activeId!)
    : requests.activeId
      ? requestKey(requests.activeId)
      : null;

  const navRef = useRef({ entries, activeKey });
  navRef.current = { entries, activeKey };

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setOverflow((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useLayoutEffect(updateOverflow, [updateOverflow, entries.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateOverflow]);

  useEffect(() => {
    if (!activeKey) return;
    const tab = scrollRef.current?.querySelector<HTMLElement>(`[data-tab-key="${CSS.escape(activeKey)}"]`);
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeKey, entries.length]);

  const focusTab = (key: string) => {
    requestAnimationFrame(() => {
      scrollRef.current?.querySelector<HTMLElement>(`[data-tab-key="${CSS.escape(key)}"]`)?.focus();
    });
  };

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const { entries: list, activeKey: current } = navRef.current;
      if (list.length === 0) return;
      const index = list.findIndex((entry) => entry.key === current);

      let target: number | null = null;
      if (event.key === 'Tab') target = index + (event.shiftKey ? -1 : 1);
      else if (event.key === 'PageDown' && !event.shiftKey) target = index + 1;
      else if (event.key === 'PageUp' && !event.shiftKey) target = index - 1;
      else if (!event.shiftKey && /^[1-9]$/.test(event.key)) {
        const n = Number(event.key);
        target = n === 9 ? list.length - 1 : n - 1;
        if (target >= list.length) return;
      }
      if (target === null) return;

      event.preventDefault();
      if (/^[1-9]$/.test(event.key)) list[target].activate();
      else list[(target + list.length) % list.length].activate();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onTablistKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = (event.target as HTMLElement).dataset.tabKey;
    if (!key) return;
    const index = entries.findIndex((entry) => entry.key === key);
    if (index === -1) return;

    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % entries.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + entries.length) % entries.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = entries.length - 1;
    else return;

    event.preventDefault();
    entries[next].activate();
    focusTab(entries[next].key);
  };

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const clearDrag = () => {
    setDragId(null);
    setDrop(null);
  };

  const onTabDragStart = (id: string) => (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDragId(id);
  };

  const onTabDragOver = (id: string) => (event: DragEvent<HTMLDivElement>) => {
    if (!dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (id === dragId) {
      if (drop) setDrop(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const side: DropSide = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
    if (drop?.id !== id || drop.side !== side) setDrop({ id, side });
  };

  const onTabDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!dragId) return;
    event.preventDefault();
    if (drop) {
      const rest = requests.open.filter((tab) => tab.id !== dragId);
      const targetIndex = rest.findIndex((tab) => tab.id === drop.id);
      if (targetIndex !== -1) requests.onMove(dragId, targetIndex + (drop.side === 'after' ? 1 : 0));
    }
    clearDrag();
  };

  const scrollClass =
    'tabs-scroll' + (overflow.left ? ' fade-left' : '') + (overflow.right ? ' fade-right' : '');
  const hasOverflow = overflow.left || overflow.right;

  return (
    <div className="tabsbar">
      {hasOverflow && (
        <button
          className="tabs-nav"
          onClick={() => scrollByPage(-1)}
          disabled={!overflow.left}
          title="Rolar abas para a esquerda"
          aria-label="Rolar abas para a esquerda"
        >
          ‹
        </button>
      )}
      <div
        ref={scrollRef}
        className={scrollClass}
        role="tablist"
        aria-label="Abas abertas"
        onScroll={updateOverflow}
        onWheel={(event) => {
          const el = scrollRef.current;
          if (!el || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
          el.scrollLeft += event.deltaY;
        }}
        onDoubleClick={(event) => event.target === event.currentTarget && requests.onAdd()}
        onKeyDown={onTablistKeyDown}
      >
        {docs.open.map((scope) => (
          <WorkspaceTab
            key={docsKey(scope.id)}
            tabKey={docsKey(scope.id)}
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
            tabKey={requestKey(tab.id)}
            label={tab.title}
            tooltip={`${tab.method} ${tab.url}`}
            leading={<small className={'tab-method m-' + tab.method.toLowerCase()}>{methodShort(tab.method)}</small>}
            active={!showingDocs && tab.id === requests.activeId}
            dragging={dragId === tab.id}
            dropSide={drop?.id === tab.id ? drop.side : null}
            onActivate={() => requests.onActivate(tab.id)}
            onClose={() => requests.onClose(tab.id)}
            onContextMenu={(event) => openAt(event, { kind: 'request', tab })}
            onDragStart={onTabDragStart(tab.id)}
            onDragOver={onTabDragOver(tab.id)}
            onDrop={onTabDrop}
            onDragEnd={clearDrag}
          />
        ))}
      </div>
      {hasOverflow && (
        <button
          className="tabs-nav"
          onClick={() => scrollByPage(1)}
          disabled={!overflow.right}
          title="Rolar abas para a direita"
          aria-label="Rolar abas para a direita"
        >
          ›
        </button>
      )}
      {entries.length > 1 && (
        <button
          className="tabs-nav tabs-list"
          onClick={(event) => openBelow(event, { kind: 'list' })}
          title="Todas as abas abertas"
          aria-label="Todas as abas abertas"
          aria-haspopup="menu"
        >
          ▾<span className="tabs-count">{entries.length}</span>
        </button>
      )}
      <button className="addtab" onClick={requests.onAdd} title="Nova requisição (Ctrl+T)">
        ＋
      </button>
      <span className="hint tabs-hint">Dica: Ctrl+Tab alterna entre abas; arraste para reordenar</span>

      {menu && (
        <ContextMenu position={menu.position} onClose={close}>
          {menu.target.kind === 'request' ? (
            <RequestTabMenu tab={menu.target.tab} tabs={requests} />
          ) : menu.target.kind === 'docs' ? (
            <DocsTabMenu scope={menu.target.scope} docs={docs} />
          ) : (
            <OpenTabsList requests={requests} docs={docs} activeKey={activeKey} />
          )}
        </ContextMenu>
      )}
    </div>
  );
}

function OpenTabsList({
  requests,
  docs,
  activeKey,
}: WorkspaceTabsBarProps & { activeKey: string | null }) {
  return (
    <div className="tabs-list-menu">
      {docs.open.length > 0 && (
        <>
          <MenuLabel>Documentação</MenuLabel>
          {docs.open.map((scope) => (
            <MenuItem
              key={scope.id}
              checked={activeKey === docsKey(scope.id)}
              onSelect={() => docs.onActivate(scope.id)}
            >
              {scope.label}
            </MenuItem>
          ))}
        </>
      )}
      {docs.open.length > 0 && requests.open.length > 0 && <MenuSeparator />}
      {requests.open.length > 0 && (
        <>
          <MenuLabel>Requisições</MenuLabel>
          {requests.open.map((tab) => (
            <MenuItem
              key={tab.id}
              checked={activeKey === requestKey(tab.id)}
              onSelect={() => requests.onActivate(tab.id)}
            >
              <small className={'tab-method m-' + tab.method.toLowerCase()}>{methodShort(tab.method)}</small>
              {tab.title}
            </MenuItem>
          ))}
        </>
      )}
    </div>
  );
}
