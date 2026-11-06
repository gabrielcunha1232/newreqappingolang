import type { DocsFocus } from '../../hooks/useApiDocs';
import type { DocsScope } from '../../lib/apiDocsScope';
import type { SavedRequest } from '../../types';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ApiDocsView } from './ApiDocsView';
import type { EndpointActions } from './endpointActions';

interface DocsTabsHostProps {
  scopes: DocsScope[];
  activeId: string | null;
  requests: SavedRequest[];
  focus: DocsFocus | null;
  endpointActions: EndpointActions;
  onExportOpenApi: (scope: DocsScope) => void;
}

/**
 * Conteúdo das abas de documentação. Todas ficam montadas (só a ativa
 * aparece), para cada aba manter rolagem, filtro e endpoints expandidos.
 */
export function DocsTabsHost({ scopes, activeId, requests, focus, endpointActions, onExportOpenApi }: DocsTabsHostProps) {
  return (
    <>
      {scopes.map((scope) => (
        <div key={scope.id} className="docs-tab-content" role="tabpanel" hidden={scope.id !== activeId}>
          <ErrorBoundary label="esta documentação">
            <ApiDocsView
              scope={scope}
              requests={requests}
              focus={focus}
              endpointActions={endpointActions}
              onExport={() => onExportOpenApi(scope)}
            />
          </ErrorBoundary>
        </div>
      ))}
    </>
  );
}
