import { FlaskConical, LayoutDashboard, Settings } from 'lucide-react';

export type SidebarNavKey = 'workspaceCanvas' | 'projects' | 'settings';

export type SidebarNavItem = {
  key: SidebarNavKey;
  icon: typeof LayoutDashboard;
  labelKey: string;
  globalHref: string;
};

export type SidebarNavGroup = {
  labelKey: 'shell.groupWorkspace' | 'shell.groupSystem';
  items: SidebarNavItem[];
};

/** Sprint 5.1 Beta IA — Workspace · Projects · Settings (legacy menus removed). */
export const SIDEBAR_NAV_GROUPS: SidebarNavGroup[] = [
  {
    labelKey: 'shell.groupWorkspace',
    items: [
      {
        key: 'workspaceCanvas',
        icon: LayoutDashboard,
        labelKey: 'nav.validation',
        globalHref: '/validation',
      },
      {
        key: 'projects',
        icon: FlaskConical,
        labelKey: 'nav.projects',
        globalHref: '/workspace',
      },
    ],
  },
  {
    labelKey: 'shell.groupSystem',
    items: [
      {
        key: 'settings',
        icon: Settings,
        labelKey: 'nav.settings',
        globalHref: '/settings',
      },
    ],
  },
];

export function resolveSidebarHref(item: SidebarNavItem, _projectId?: string | null): string {
  return item.globalHref;
}

export function isSidebarItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== '/workspace' && pathname.startsWith(`${href}/`)) return true;
  if (href === '/workspace' && (pathname === '/workspace' || pathname.startsWith('/workspace/')))
    return true;
  if (href === '/validation' && pathname.startsWith('/validation')) return true;
  return false;
}
