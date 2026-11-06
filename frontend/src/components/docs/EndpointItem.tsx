import { useEffect, useId, useRef, useState } from 'react';
import type { ApiEndpoint } from '../../types';
import { Icon } from '../common/Icon';
import { MethodBadge } from '../common/MethodBadge';
import { EndpointDetails } from './EndpointDetails';
import { PathTemplate } from './PathTemplate';

const HIGHLIGHT_MS = 1600;

interface EndpointItemProps {
  endpoint: ApiEndpoint;
  /** Definido quando este endpoint deve ser aberto e mostrado (muda a cada pedido). */
  focusNonce?: number;
  onTryIt: (requestId: string) => void;
}

/** Linha recolhível de um endpoint (método, caminho e resumo), como no Swagger UI. */
export function EndpointItem({ endpoint, focusNonce, onTryIt }: EndpointItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const detailsId = useId();
  const { requestId } = endpoint;

  useEffect(() => {
    if (focusNonce === undefined) return;
    setExpanded(true);
    setHighlighted(true);
    ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    const timer = window.setTimeout(() => setHighlighted(false), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [focusNonce]);

  const className =
    'docs-endpoint' +
    (expanded ? ' open' : '') +
    (highlighted ? ' highlighted' : '') +
    (endpoint.deprecated ? ' deprecated' : '');

  return (
    <article ref={ref} className={className}>
      <button
        className="docs-endpoint-head"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
      >
        <MethodBadge method={endpoint.method} full className="docs-method" />
        <PathTemplate path={endpoint.path} />
        {endpoint.summary && <span className="docs-summary">{endpoint.summary}</span>}
        <Icon name="chevron" size={12} className={'docs-chevron' + (expanded ? ' open' : '')} />
      </button>

      {expanded && (
        <div id={detailsId}>
          <EndpointDetails endpoint={endpoint} onTryIt={requestId ? () => onTryIt(requestId) : undefined} />
        </div>
      )}
    </article>
  );
}
