import { useMemo, useState } from 'react';
import { HELP_TOPICS, filterHelpTopics, type HelpBlock } from '../../lib/helpContent';
import { Modal } from './Modal';

interface HelpDialogProps {
  initialTopic: string;
  onClose: () => void;
}

function Block({ block }: { block: HelpBlock }) {
  if ('text' in block) return <p>{block.text}</p>;
  if ('code' in block) return <pre className="help-code">{block.code}</pre>;
  return (
    <ul>
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function HelpDialog({ initialTopic, onClose }: HelpDialogProps) {
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState(initialTopic);
  const topics = useMemo(() => filterHelpTopics(HELP_TOPICS, term), [term]);
  const topic = topics.find((t) => t.id === selected) ?? topics[0];

  return (
    <Modal title="Guia de funcionalidades" width={860} onClose={onClose} initialFocus=".help-search">
      <div className="help">
        <nav className="help-nav" aria-label="Tópicos de ajuda">
          <input
            className="help-search"
            aria-label="Buscar na ajuda"
            placeholder="Buscar na ajuda"
            spellCheck={false}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <div className="help-topics">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                className={'help-topic' + (t.id === topic?.id ? ' active' : '')}
                aria-current={t.id === topic?.id ? 'true' : undefined}
                onClick={() => setSelected(t.id)}
              >
                {t.title}
              </button>
            ))}
          </div>
        </nav>

        <article key={topic?.id} className="help-content" tabIndex={0}>
          {topic ? (
            <>
              <h3>{topic.title}</h3>
              {topic.blocks.map((block, index) => (
                <Block key={index} block={block} />
              ))}
            </>
          ) : (
            <p className="muted">Nada encontrado para "{term}".</p>
          )}
        </article>
      </div>
    </Modal>
  );
}
