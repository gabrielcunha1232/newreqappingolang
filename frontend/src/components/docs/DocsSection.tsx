import type { ReactNode } from 'react';

interface DocsSectionProps {
  title: string;
  /** Texto curto à direita do título (ex.: content-type). */
  aside?: ReactNode;
  children: ReactNode;
}

/** Bloco titulado dentro dos detalhes de um endpoint. */
export function DocsSection({ title, aside, children }: DocsSectionProps) {
  return (
    <section className="docs-section">
      <header className="docs-section-head">
        <h4>{title}</h4>
        {aside && <span className="docs-section-aside">{aside}</span>}
      </header>
      {children}
    </section>
  );
}
