import { useCallback, useEffect, useState } from 'react';
import { Events } from "@wailsio/runtime";
import { Load, Save } from '../bindings/changeme/collectionservice';
import type { Endpoint } from '../bindings/changeme/internal/models/models';
import { Layout } from './components/Layout';
import { HttpClient } from './components/HttpClient';
import { ScannerPanel } from './components/ScannerPanel';
import { Sidebar } from './components/Sidebar';
import type { Collection, PersistedState, Tab } from './types';

type View = 'client' | 'scanner' | 'history';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function newTab(collectionId: string | null = null): Tab {
  return {
    id: generateId(),
    collectionId,
    method: 'GET',
    url: 'https://httpbin.org/get',
    headers: '{}',
    body: '',
    response: null,
    error: '',
    loading: false,
    title: 'Nova requisição',
  };
}

function tabFromEndpoint(endpoint: Endpoint, collectionId: string | null): Tab {
  const tab = newTab(collectionId);
  tab.method = endpoint.method;
  tab.url = endpoint.path;
  tab.title = `${endpoint.method} ${endpoint.path}`;
  return tab;
}

/** "C:\Projetos\GOLANG\teste" → "teste" */
function collectionNameFromPath(dir: string): string {
  const parts = dir.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || 'Endpoints';
}

function App() {
  const [view, setView] = useState<View>('client');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([newTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [hydrated, setHydrated] = useState(false);

  const onViewChange = (next: string) => {
    setView(next as View);
  };

  /* ===== Persistência (coleções + requisições) ===== */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = await Load();
        if (!cancelled && raw) {
          const state = JSON.parse(raw) as Partial<PersistedState>;
          const restored: Tab[] = (state.requests ?? []).map((request) => ({
            id: request.id,
            collectionId: request.collectionId ?? null,
            title: request.title,
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: request.body,
            response: null,
            error: '',
            loading: false,
          }));

          setCollections(state.collections ?? []);
          if (restored.length > 0) {
            setTabs(restored);
            setActiveTabId(restored[0].id);
          }
        }
      } catch {
        // Sem bridge do Wails (ex.: preview no navegador): segue em memória.
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const timeout = setTimeout(() => {
      const state: PersistedState = {
        collections,
        requests: tabs.map((tab) => ({
          id: tab.id,
          collectionId: tab.collectionId,
          title: tab.title,
          method: tab.method,
          url: tab.url,
          headers: tab.headers,
          body: tab.body,
        })),
      };
      Save(JSON.stringify(state)).catch(() => {
        // Falha de gravação não deve interromper o uso do app.
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [hydrated, collections, tabs]);

  /* ===== Requisições ===== */

  const addTab = useCallback((collectionId: string | null = null) => {
    const tab = newTab(collectionId);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      const currentIndex = tabs.findIndex((t) => t.id === id);
      if (currentIndex === -1) return;

      const next = tabs.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = newTab();
        setTabs([fresh]);
        setActiveTabId(fresh.id);
        return;
      }

      setTabs(next);
      if (activeTabId === id) {
        setActiveTabId(next[Math.min(currentIndex, next.length - 1)].id);
      }
    },
    [tabs, activeTabId]
  );

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const renameTab = useCallback((id: string, title: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title } : t))
    );
  }, []);

  const moveTabToCollection = useCallback(
    (tabId: string, collectionId: string | null) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, collectionId } : t))
      );
    },
    []
  );

  /* ===== Coleções ===== */

  const addCollection = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCollections((prev) => [
      ...prev,
      { id: generateId(), name: trimmed, collapsed: false },
    ]);
  }, []);

  const renameCollection = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c))
    );
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setTabs((prev) =>
      prev.map((t) => (t.collectionId === id ? { ...t, collectionId: null } : t))
    );
  }, []);

  const toggleCollection = useCallback((id: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, collapsed: !c.collapsed } : c))
    );
  }, []);

  /* ===== Scanner ===== */

  // Ao escanear: cria (ou reutiliza) a coleção com o nome da pasta e importa
  // todos os endpoints encontrados como requisições, sem duplicar.
  const handleScanComplete = useCallback(
    (dir: string, endpoints: Endpoint[]) => {
      if (endpoints.length === 0) return;

      const name = collectionNameFromPath(dir);
      const existing = collections.find(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      );
      const collectionId = existing?.id ?? generateId();

      const imported = endpoints
        .filter(
          (endpoint) =>
            !tabs.some(
              (t) =>
                t.collectionId === collectionId &&
                t.method === endpoint.method &&
                t.url === endpoint.path
            )
        )
        .map((endpoint) => tabFromEndpoint(endpoint, collectionId));

      if (!existing) {
        setCollections((prev) => [
          ...prev,
          { id: collectionId, name, collapsed: false },
        ]);
      }
      if (imported.length > 0) {
        setTabs((prev) => [...prev, ...imported]);
        setActiveTabId(imported[0].id);
      }
    },
    [collections, tabs]
  );

  // Clicar num endpoint já importado apenas abre a aba dele.
  const handleEndpointSelect = useCallback(
    (endpoint: Endpoint) => {
      const existing = tabs.find(
        (t) => t.method === endpoint.method && t.url === endpoint.path
      );
      if (existing) {
        setActiveTabId(existing.id);
        setView('client');
        return;
      }

      const tab = tabFromEndpoint(endpoint, null);
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
      setView('client');
    },
    [tabs]
  );

  useEffect(() => {
    Events.On('time', () => {
      // Evento de tempo registrado; pode ser reativado no footer futuramente.
    });
  }, []);

  return (
    <Layout>
      <Sidebar
        view={view}
        onViewChange={onViewChange}
        onAddTab={addTab}
        collections={collections}
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTab}
        onTabClose={closeTab}
        onTabRename={renameTab}
        onMoveTab={moveTabToCollection}
        onAddCollection={addCollection}
        onRenameCollection={renameCollection}
        onDeleteCollection={deleteCollection}
        onToggleCollection={toggleCollection}
      />
      <main className="main">
        {view === 'client' && (
          <HttpClient
            tabs={tabs}
            activeTabId={activeTabId}
            onUpdate={updateTab}
          />
        )}
        {view === 'scanner' && (
          <ScannerPanel
            onEndpointSelect={handleEndpointSelect}
            onScanComplete={handleScanComplete}
          />
        )}
        {view === 'history' && (
          <div className="view">
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Histórico</span>
              </div>
              <div className="panel-body empty-state">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <h3>Histórico vazio</h3>
                <p>Suas requisições aparecerão aqui em breve.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

export default App;
