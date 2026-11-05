import type { ReactNode } from 'react';
import type { MenuDefinition } from '../../types';
import { MenuBar } from './MenuBar';

interface AppShellProps {
  menus: MenuDefinition[];
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ menus, sidebar, children }: AppShellProps) {
  return (
    <>
      <div className="topbar">
        <span>▣ &nbsp; NewPostman — API Workbench</span>
      </div>
      <MenuBar menus={menus} />
      <div className="app">
        {sidebar}
        {children}
      </div>
    </>
  );
}
