import { useEffect, useId, useState } from 'react';
import type { DocsFocus } from '../../hooks/useApiDocs';
import type { ApiEndpointGroup } from '../../types';
import { Icon } from '../common/Icon';
import { EndpointItem } from './EndpointItem';
import type { EndpointActions } from './endpointActions';

interface EndpointGroupProps {
  group: ApiEndpointGroup;
  focus: DocsFocus | null;
  actions: EndpointActions;
}

/** Seção de endpoints com a mesma tag (recurso), recolhível. */
export function EndpointGroup({ group, focus, actions }: EndpointGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const listId = useId();
  const focusedHere = focus !== null && group.endpoints.some((e) => e.id === focus.endpointId);

  // O endpoint destacado precisa estar visível.
  useEffect(() => {
    if (focusedHere) setCollapsed(false);
  }, [focusedHere, focus?.nonce]);

  return (
    <section className="docs-group">
      <button
        className="docs-group-head"
        aria-expanded={!collapsed}
        aria-controls={listId}
        onClick={() => setCollapsed((value) => !value)}
      >
        <Icon name="chevron" size={12} className={'tree-chevron' + (collapsed ? '' : ' open')} />
        <h3>{group.tag}</h3>
        <span className="tree-count">{group.endpoints.length}</span>
      </button>

      {!collapsed && (
        <div id={listId} className="docs-group-list">
          {group.endpoints.map((endpoint) => (
            <EndpointItem
              key={endpoint.id}
              endpoint={endpoint}
              focusNonce={focus?.endpointId === endpoint.id ? focus.nonce : undefined}
              actions={actions}
            />
          ))}
        </div>
      )}
    </section>
  );
}
