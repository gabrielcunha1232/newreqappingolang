import { RequestForm } from './RequestForm';
import { ResponsePanel } from './ResponsePanel';
import { RequestError } from './RequestError';
import type { Collection, Tab } from '../types';

interface HttpClientProps {
  tabs: Tab[];
  collections: Collection[];
  activeTabId: string;
  onUpdate: (id: string, updates: Partial<Tab>) => void;
}

/** Junta a URL base da coleção com caminhos relativos ("/albums"). */
function resolveUrl(
  rawUrl: string,
  collection: Collection | undefined
): { url: string; error: string } {
  const url = rawUrl.trim();
  if (!url.startsWith('/')) {
    return { url, error: '' };
  }

  const base = (collection?.baseUrl ?? '').trim().replace(/\/+$/, '');
  if (!base) {
    const alvo = collection ? `da coleção "${collection.name}"` : 'da coleção da aba';
    return {
      url: '',
      error: `A requisição usa o caminho "${url}", mas não há URL base ${alvo}. Defina-a no menu ⋯ da coleção ou use uma URL completa.`,
    };
  }

  return { url: base + url, error: '' };
}

export function HttpClient({
  tabs,
  collections,
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

              const collection = collections.find(
                (c) => c.id === activeTab.collectionId
              );
              const { url: finalUrl, error: urlError } = resolveUrl(
                activeTab.url,
                collection
              );
              if (urlError) {
                onUpdate(activeTab.id, { error: urlError, loading: false });
                return;
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
                    url: finalUrl,
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
