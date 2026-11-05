import type { Response } from "../../bindings/changeme/internal/models";

interface ResponsePanelProps {
  response: Response | null;
}

export function ResponsePanel({ response }: ResponsePanelProps) {
  if (!response) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Response</span>
        </div>
        <div className="panel-body empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M12 12L2 21l10-5 10 5L12 12z" />
          </svg>
          <h3>Sem resposta ainda</h3>
          <p>Envie uma requisição para ver a resposta aqui.</p>
        </div>
      </div>
    );
  }

  const statusCode = response.status_code || 0;
  const statusClass =
    statusCode >= 200 && statusCode < 300 ? 'status-2xx' :
    statusCode >= 300 && statusCode < 400 ? 'status-3xx' :
    statusCode >= 400 && statusCode < 500 ? 'status-4xx' :
    'status-5xx';

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Response</span>
      </div>
      <div className="panel-body">
        <div className="response-meta">
          <span className="meta-item">
            <span>Status</span>
            <span className={`meta-value status-badge ${statusClass}`}>{statusCode}</span>
          </span>
          <span className="meta-item">
            <span>Tempo</span>
            <span className="meta-value">{response.time_spent} ms</span>
          </span>
          <span className="meta-item">
            <span>Tamanho</span>
            <span className="meta-value">{response.size} bytes</span>
          </span>
        </div>
        <div className="response-body">
          {response.body || '(empty response body)'}
        </div>
      </div>
    </div>
  );
}
