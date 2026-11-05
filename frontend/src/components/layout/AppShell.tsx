import type { ReactNode } from 'react';
import { BRAND_ICON } from '../../lib/brand';
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
        <img className="topbar-icon" src={BRAND_ICON.small} alt="" />
        <span>Forkarsenet — API Workbench</span>
      </div>
      <MenuBar menus={menus} />
      <div className="app">
        {sidebar}
        {children}
      </div>
    </>
  );
}
