import type { ReactNode } from 'react';
import { BRAND_ICON } from '../../lib/brand';
import type { MenuDefinition } from '../../types';
import { MenuBar } from './MenuBar';

interface AppShellProps {
  menus: MenuDefinition[];
  themeName: string;
  onOpenTheme: () => void;
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ menus, themeName, onOpenTheme, sidebar, children }: AppShellProps) {
  return (
    <>
      <div className="topbar">
        <img className="topbar-icon" src={BRAND_ICON.small} alt="" />
        <span>Forkarsenet — API Workbench</span>
      </div>
      <MenuBar menus={menus} themeName={themeName} onOpenTheme={onOpenTheme} />
      <div className="app">
        {sidebar}
        {children}
      </div>
    </>
  );
}
