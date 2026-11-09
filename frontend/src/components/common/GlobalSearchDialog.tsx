import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { indexItems, searchIndex, type SearchItem, type SearchKind } from '../../lib/globalSearch';
import { MethodBadge } from './MethodBadge';
import { Modal } from './Modal';

const KIND_LABEL: Record<SearchKind, string> = {
  request: 'Requisição',
  folder: 'Pasta',
  collection: 'Coleção',
  environment: 'Ambiente',
  command: 'Comando',
};

interface GlobalSearchDialogProps {
  items: SearchItem[];
  onClose: () => void;
}

export function GlobalSearchDialog({ items, onClose }: GlobalSearchDialogProps) {
  const listId = useId();
  const [term, setTerm] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const index = useMemo(() => indexItems(items), [items]);
  const results = useMemo(() => searchIndex(index, term), [index, term]);
  const current = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    listRef.current?.children[current]?.scrollIntoView({ block: 'nearest' });
  }, [current, results]);

  const choose = (item: SearchItem | undefined) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      choose(results[current]);
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length > 0) {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current + step + results.length) % results.length);
    }
  };

  return (
    <Modal title="Busca global" width={640} onClose={onClose} initialFocus=".global-search-input">
      <div className="global-search">
        <input
          className="global-search-input"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-label="Buscar requisições, pastas, coleções, ambientes e comandos"
          aria-activedescendant={results[current] ? `${listId}-${current}` : undefined}
          placeholder="Buscar requisições, pastas, coleções, ambientes e comandos"
          spellCheck={false}
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />

        {results.length === 0 ? (
          <p className="global-search-empty">Nada encontrado para "{term}".</p>
        ) : (
          <ul ref={listRef} id={listId} className="global-search-list" role="listbox" aria-label="Resultados">
            {results.map((item, position) => (
              <li
                key={item.id}
                id={`${listId}-${position}`}
                role="option"
                aria-selected={position === current}
                className={'global-search-item' + (position === current ? ' active' : '')}
                onMouseMove={() => setActive(position)}
                onClick={() => choose(item)}
              >
                <span className="global-search-kind">{item.method ? <MethodBadge method={item.method} /> : KIND_LABEL[item.kind]}</span>
                <span className="global-search-text">
                  <span className="global-search-title">{item.title}</span>
                  {item.subtitle && <span className="global-search-subtitle">{item.subtitle}</span>}
                </span>
                {item.shortcut && <kbd>{item.shortcut}</kbd>}
              </li>
            ))}
          </ul>
        )}

        <p className="hint">↑↓ navega · Enter abre · Esc fecha</p>
      </div>
    </Modal>
  );
}
