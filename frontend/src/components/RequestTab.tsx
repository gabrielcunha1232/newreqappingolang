import type { FormEvent } from 'react';
import { DoRequest } from '../../bindings/changeme/httpclientservice';
import { Request } from '../../bindings/changeme/internal/models/models';
import { RequestForm } from './RequestForm';
import { ResponsePanel } from './ResponsePanel';
import { RequestError } from './RequestError';
import type { Tab } from '../types';

interface RequestTabProps {
  tab: Tab;
  onUpdate: (updates: Partial<Tab>) => void;
}

export function RequestTab({ tab, onUpdate }: RequestTabProps) {
  const doRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onUpdate({ error: '', response: null, loading: true });

    let parsedHeaders: unknown;
    try {
      parsedHeaders = JSON.parse(tab.headers || '{}');
    } catch {
      onUpdate({ error: 'Headers devem ser um JSON válido.', loading: false });
      return;
    }

    if (parsedHeaders === null || typeof parsedHeaders !== 'object' || Array.isArray(parsedHeaders)) {
      onUpdate({ error: 'Headers deve ser um objeto JSON.', loading: false });
      return;
    }

    const requestHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsedHeaders)) {
      if (typeof value !== 'string') {
        onUpdate({ error: 'Todo valor de header deve ser uma string.', loading: false });
        return;
      }
      requestHeaders[key] = value;
    }

    try {
      const result = await DoRequest(new Request({
        method: tab.method,
        url: tab.url,
        headers: requestHeaders,
        body: tab.body,
      }));
      onUpdate({ response: result, loading: false });
    } catch (requestError) {
      onUpdate({
        error: requestError instanceof Error ? requestError.message : String(requestError),
        loading: false,
      });
    }
  };

  return (
    <div className="view client-grid">
      <div className="panel">
        <RequestForm
          method={tab.method}
          url={tab.url}
          headers={tab.headers}
          body={tab.body}
          loading={tab.loading}
          onMethodChange={(value) => onUpdate({ method: value })}
          onUrlChange={(value) => onUpdate({ url: value })}
          onHeadersChange={(value) => onUpdate({ headers: value })}
          onBodyChange={(value) => onUpdate({ body: value })}
          onSubmit={doRequest}
        />
      </div>
      <div className="panel">
        <ResponsePanel response={tab.response} />
        {tab.error && <RequestError message={tab.error} />}
      </div>
    </div>
  );
}
