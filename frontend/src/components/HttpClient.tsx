import { RequestForm } from './RequestForm';
import { ResponsePanel } from './ResponsePanel';
import { RequestError } from './RequestError';
import type { Tab } from '../types';

interface HttpClientProps {
  tabs: Tab[];
  activeTabId: string;
  onUpdate: (id: string, updates: Partial<Tab>) => void;
}

export function HttpClient({
  tabs,
  activeTabId,
  onUpdate,
}: HttpClientProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <div className="client-view">
      <div className="client-grid">
        <div className="panel">
          <RequestForm
            method={activeTab.method}
            url={activeTab.url}
            headers={activeTab.headers}
            body={activeTab.body}
            loading={activeTab.loading}
            onMethodChange={(value) => onUpdate(activeTab.id, { method: value })}
            onUrlChange={(value) => onUpdate(activeTab.id, { url: value })}
            onHeadersChange={(value) => onUpdate(activeTab.id, { headers: value })}
            onBodyChange={(value) => onUpdate(activeTab.id, { body: value })}
            onSubmit={async (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              onUpdate(activeTab.id, { error: '', response: null, loading: true });

              let parsedHeaders: unknown;
              try {
                parsedHeaders = JSON.parse(activeTab.headers || '{}');
              } catch {
                onUpdate(activeTab.id, {
                  error: 'Headers devem ser um JSON válido.',
                  loading: false,
                });
                return;
              }

              if (
                parsedHeaders === null ||
                typeof parsedHeaders !== 'object' ||
                Array.isArray(parsedHeaders)
              ) {
                onUpdate(activeTab.id, {
                  error: 'Headers deve ser um objeto JSON.',
                  loading: false,
                });
                return;
              }

              const requestHeaders: Record<string, string> = {};
              for (const [key, value] of Object.entries(parsedHeaders)) {
                if (typeof value !== 'string') {
                  onUpdate(activeTab.id, {
                    error: 'Todo valor de header deve ser uma string.',
                    loading: false,
                  });
                  return;
                }
                requestHeaders[key] = value;
              }

              try {
                const { DoRequest } = await import(
                  '../../bindings/changeme/httpclientservice'
                );
                const { Request } = await import(
                  '../../bindings/changeme/internal/models/models'
                );
                const result = await DoRequest(
                  new Request({
                    method: activeTab.method,
                    url: activeTab.url,
                    headers: requestHeaders,
                    body: activeTab.body,
                  })
                );
                onUpdate(activeTab.id, { response: result, loading: false });
              } catch (requestError) {
                onUpdate(activeTab.id, {
                  error:
                    requestError instanceof Error
                      ? requestError.message
                      : String(requestError),
                  loading: false,
                });
              }
            }}
          />
        </div>
        <div className="panel">
          <ResponsePanel response={activeTab.response} />
          {activeTab.error && (
            <RequestError message={activeTab.error} />
          )}
        </div>
      </div>
    </div>
  );
}
