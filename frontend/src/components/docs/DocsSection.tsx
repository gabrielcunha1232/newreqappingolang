import type { ReactNode } from 'react';

interface DocsSectionProps {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}

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
