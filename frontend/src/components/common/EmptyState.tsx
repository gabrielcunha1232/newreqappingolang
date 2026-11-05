import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  children?: ReactNode;
}

export function EmptyState({ icon = '◇', title, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      {children && <div className="empty-text">{children}</div>}
    </div>
  );
}
