import type { Tab } from '../types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabClick, onTabClose }: TabBarProps) {
  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onTabClick(tab.id)}
          >
            <span className="tab-title">{tab.title || `${tab.method} ${tab.url}`}</span>
            <button
              className="tab-close"
              onClick={(event) => {
                event.stopPropagation();
                onTabClose(tab.id);
              }}
              aria-label={`Fechar aba ${tab.title}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
