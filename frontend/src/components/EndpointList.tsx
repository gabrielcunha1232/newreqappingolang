import type { Endpoint } from "../../bindings/changeme/internal/models/models";

interface EndpointListProps {
  endpoints: Endpoint[];
  selectedEndpoint: Endpoint | null;
  onSelect: (endpoint: Endpoint) => void;
}

export function EndpointList({ endpoints, selectedEndpoint, onSelect }: EndpointListProps) {
  if (endpoints.length === 0) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
        <h3>Nenhum endpoint encontrado</h3>
        <p>Informe um diretório de projeto Go e clique em "Escanear".</p>
      </div>
    );
  }

  return (
    <div className="scan-result">
      <div className="endpoint-list">
        {endpoints.map((endpoint) => {
          const isSelected = selectedEndpoint?.path === endpoint.path && selectedEndpoint?.method === endpoint.method;
          return (
            <div
              key={`${endpoint.method}:${endpoint.path}`}
              className={`endpoint-row ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(endpoint)}
            >
              <span className={`method-badge method-${endpoint.method}`}>{endpoint.method}</span>
              <span className="endpoint-path">{endpoint.path}</span>
              <span className="endpoint-source" title={endpoint.source_file}>
                {endpoint.source_file.split('/').pop()?.split('\\').pop() || endpoint.source_file}
              </span>
            </div>
          );
        })}
      </div>
      <p className="endpoint-hint">
        {endpoints.length} endpoint{endpoints.length > 1 ? 's' : ''} encontrado(s) e
        importado(s) para uma coleção. Clique em um endpoint para abri-lo no cliente HTTP.
      </p>
    </div>
  );
}
