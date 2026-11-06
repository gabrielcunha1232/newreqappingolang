import type { DocsFocus } from '../../hooks/useApiDocs';
import type { DocsScope } from '../../lib/apiDocsScope';
import type { SavedRequest } from '../../types';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ApiDocsView } from './ApiDocsView';

interface DocsTabsHostProps {
  scopes: DocsScope[];
  activeId: string | null;
  requests: SavedRequest[];
  focus: DocsFocus | null;
  onTryIt: (requestId: string) => void;
}

/**
 * Conteúdo das abas de documentação. Todas ficam montadas (só a ativa
 * aparece), para cada aba manter rolagem, filtro e endpoints expandidos.
 */
export function DocsTabsHost({ scopes, activeId, requests, focus, onTryIt }: DocsTabsHostProps) {
  return (
    <>
      {scopes.map((scope) => (
        <div key={scope.id} className="docs-tab-content" role="tabpanel" hidden={scope.id !== activeId}>
          <ErrorBoundary label="esta documentação">
            <ApiDocsView
              scope={scope}
              requests={requests}
              focus={focus}
              onTryIt={onTryIt}
            />
          </ErrorBoundary>
        </div>
      ))}
    </>
  );
}
