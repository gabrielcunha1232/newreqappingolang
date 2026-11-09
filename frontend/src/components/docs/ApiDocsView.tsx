import { useEffect, useMemo, useState } from 'react';
import type { DocsFocus } from '../../hooks/useApiDocs';
import { endpointsForScope, type DocsScope } from '../../lib/apiDocsScope';
import { groupEndpoints, matchesEndpoint } from '../../lib/apiEndpoints';
import type { Folder, SavedRequest } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { EndpointGroup } from './EndpointGroup';
import type { EndpointActions } from './endpointActions';

interface ApiDocsViewProps {
  scope: DocsScope;
  requests: SavedRequest[];
  folders: Folder[];
  /** Endpoint a destacar (vindo do botão "Documentação" do editor). */
  focus: DocsFocus | null;
  endpointActions: EndpointActions;
  /** Exporta esta documentação como OpenAPI. */
  onExport: () => void;
}

/**
 * Documentação no estilo Swagger UI de uma coleção. Funciona com qualquer
 * origem de endpoints: scanner, importação ou requisições criadas à mão.
 */
export function ApiDocsView({ scope, requests, folders, focus, endpointActions, onExport }: ApiDocsViewProps) {
  const [search, setSearch] = useState('');

  const endpoints = useMemo(() => endpointsForScope(scope, requests, folders), [scope, requests, folders]);
  const focused = focus && endpoints.some((e) => e.id === focus.endpointId) ? focus : null;

  // Ir até um endpoint não pode esbarrar no filtro digitado antes.
  useEffect(() => {
    if (focused) setSearch('');
  }, [focused]);

  const term = search.trim().toLowerCase();
  const groups = useMemo(
    () => groupEndpoints(endpoints.filter((endpoint) => matchesEndpoint(endpoint, term))),
    [endpoints, term]
  );

  const baseUrl = scope.collection?.baseUrl;

  return (
    <div className="docs-view">
      <header className="docs-header">
        <div className="docs-title">
          <h2>{scope.label}</h2>
          <span className="muted">
            {endpoints.length} endpoint{endpoints.length === 1 ? '' : 's'}
          </span>
          {baseUrl && <code className="docs-base-url">{baseUrl}</code>}
        </div>
        <input
          type="search"
          className="docs-search"
          placeholder="⌕  Filtrar por método, caminho ou resumo..."
          aria-label="Filtrar endpoints"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          onClick={onExport}
          disabled={endpoints.length === 0}
          title="Baixar como OpenAPI 3 (JSON), compatível com Swagger UI e outras ferramentas"
        >
          ⤓ Exportar OpenAPI
        </button>
      </header>

      {groups.length > 0 ? (
        <div className="docs-groups">
          {groups.map((group) => (
            <EndpointGroup key={group.tag} group={group} focus={focused} actions={endpointActions} />
          ))}
        </div>
      ) : term ? (
        <EmptyState icon="⌕" title={`Nada encontrado para "${search}"`} />
      ) : (
        <EmptyState icon="☰" title="Nada para documentar ainda">
          Escaneie um projeto na aba APIs ou crie requisições nesta coleção.
        </EmptyState>
      )}
    </div>
  );
}
