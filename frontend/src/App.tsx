import { useCallback, useEffect, useState } from 'react';
import { Events } from "@wailsio/runtime";
import type { Endpoint } from '../bindings/changeme/internal/models/models';
import { Layout } from './components/Layout';
import { HttpClient } from './components/HttpClient';
import { ScannerPanel } from './components/ScannerPanel';
import { Sidebar } from './components/Sidebar';
import type { Tab } from './types';

type View = 'client' | 'scanner' | 'history';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function newTab(): Tab {
  return {
    id: generateId(),
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

function App() {
  const [view, setView] = useState<View>('client');
  const [tabs, setTabs] = useState<Tab[]>([newTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  const onViewChange = (next: string) => {
    setView(next as View);
  };

  const addTab = useCallback(() => {
    const tab = newTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) {
          const fresh = newTab();
          return [fresh];
        }
        return next;
      });
      setActiveTabId((prev) => {
        if (prev !== id) return prev;
        const currentIndex = tabs.findIndex((t) => t.id === id);
        const nextIndex =
          currentIndex < tabs.length - 1 ? currentIndex : currentIndex - 1;
        return tabs[nextIndex]?.id || '';
      });
    },
    [tabs]
  );

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const handleEndpointSelect = useCallback(
    (endpoint: Endpoint) => {
      const tab = newTab();
      tab.method = endpoint.method;
      tab.url = endpoint.path;
      tab.title = `${endpoint.method} ${endpoint.path}`;
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
      setView('client');
    },
    []
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
      />
      <main className="main">
        {view === 'client' && (
          <HttpClient
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={setActiveTab}
            onTabClose={closeTab}
            onUpdate={updateTab}
          />
        )}
        {view === 'scanner' && (
          <ScannerPanel onEndpointSelect={handleEndpointSelect} />
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
