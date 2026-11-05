import type { ReactNode } from 'react';
import type { SidebarView } from '../../types';

const VIEWS: Array<{ id: SidebarView; label: string }> = [
  { id: 'collections', label: 'Coleções' },
  { id: 'history', label: 'Histórico' },
  { id: 'apis', label: 'APIs' },
];

interface SidebarProps {
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
  children: ReactNode;
}

export function Sidebar({ view, onViewChange, children }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandmark">N</div> NewPostman
      </div>
      <div className="side-tabs" role="tablist">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={view === item.id}
            className={view === item.id ? 'active' : ''}
            onClick={() => onViewChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {children}
    </aside>
  );
}
