import { useState } from 'react';

type View = 'client' | 'scanner' | 'history';

interface SidebarProps {
  view: View;
  onViewChange: (view: View) => void;
  onAddTab: () => void;
}

const navItems: Array<{ view: View; label: string; icon: string }> = [
  { view: 'client', label: 'Cliente HTTP', icon: '⌘' },
  { view: 'scanner', label: 'Scanner de Endpoints', icon: '🔍' },
  { view: 'history', label: 'Histórico', icon: '🕒' },
];

export function Sidebar({ view, onViewChange, onAddTab }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div
          className="sidebar-logo"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          <div className="logo-mark">N</div>
          {!collapsed && <span className="logo-text">NewPostman</span>}
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.view}
              className={`nav-item ${view === item.view ? 'active' : ''}`}
              onClick={() => onViewChange(item.view)}
              aria-label={item.label}
            >
              <span aria-hidden="true">{item.icon}</span>
              {!collapsed && item.label}
            </button>
          ))}
        </nav>

        <div className="nav-divider" />

        <div className="sidebar-footer">
          <button className="new-request-btn" onClick={onAddTab} title="Nova requisição">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {!collapsed && 'Nova requisição'}
          </button>
        </div>
      </div>
    </aside>
  );
}
