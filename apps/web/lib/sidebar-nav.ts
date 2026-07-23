import {
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Code2,
  FileCode,
  FileText,
  FlaskConical,
  Gauge,
  Landmark,
  LayoutDashboard,
  LineChart,
  MessageSquareQuote,
  Search,
  Settings,
  Swords,
  TrendingUp,
} from 'lucide-react';

export type SidebarNavKey =
  | 'dashboard'
  | 'projects'
  | 'startupValidation'
  | 'businessStrategy'
  | 'research'
  | 'evidence'
  | 'voc'
  | 'competitors'
  | 'marketIntelligence'
  | 'grants'
  | 'reports'
  | 'businessPlan'
  | 'prd'
  | 'devSpec'
  | 'knowledge'
  | 'agent'
  | 'settings';

export type SidebarNavItem = {
  key: SidebarNavKey;
  icon: typeof LayoutDashboard;
  labelKey: string;
  segment?: string;
  globalHref?: string;
};

export type SidebarNavGroup = {
  labelKey:
    | 'shell.groupWorkspace'
    | 'shell.groupStrategy'
    | 'shell.groupAnalysis'
    | 'shell.groupAi'
    | 'shell.groupKnowledge'
    | 'shell.groupSystem';
  items: SidebarNavItem[];
};

export const SIDEBAR_NAV_GROUPS: SidebarNavGroup[] = [
  {
    labelKey: 'shell.groupWorkspace',
    items: [
      { key: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
      { key: 'projects', icon: FlaskConical, labelKey: 'nav.projects' },
    ],
  },
  {
    labelKey: 'shell.groupStrategy',
    items: [
      {
        key: 'startupValidation',
        icon: Gauge,
        labelKey: 'nav.startupValidation',
        segment: 'validation',
      },
      {
        key: 'businessStrategy',
        icon: LineChart,
        labelKey: 'nav.businessStrategy',
        segment: 'business-strategy',
      },
    ],
  },
  {
    labelKey: 'shell.groupAnalysis',
    items: [
      { key: 'research', icon: Search, labelKey: 'nav.research', segment: 'research', globalHref: '/research' },
      { key: 'evidence', icon: FileText, labelKey: 'nav.evidence', segment: 'evidence', globalHref: '/evidence' },
      { key: 'voc', icon: MessageSquareQuote, labelKey: 'nav.voc', segment: 'voc', globalHref: '/voc' },
      {
        key: 'competitors',
        icon: Swords,
        labelKey: 'nav.competitors',
        segment: 'competitors',
        globalHref: '/competitors',
      },
      {
        key: 'marketIntelligence',
        icon: TrendingUp,
        labelKey: 'nav.marketIntelligence',
        segment: 'market-intelligence',
      },
      { key: 'grants', icon: Landmark, labelKey: 'nav.grants', segment: 'grants', globalHref: '/government-grants' },
    ],
  },
  {
    labelKey: 'shell.groupAi',
    items: [
      {
        key: 'reports',
        icon: BarChart3,
        labelKey: 'nav.decisionReport',
        segment: 'reports',
        globalHref: '/reports',
      },
      {
        key: 'businessPlan',
        icon: Briefcase,
        labelKey: 'nav.strategyReport',
        segment: 'business-plan',
      },
      { key: 'prd', icon: FileCode, labelKey: 'nav.prd', segment: 'prd' },
      {
        key: 'devSpec',
        icon: Code2,
        labelKey: 'nav.devSpec',
        segment: 'development-spec',
      },
    ],
  },
  {
    labelKey: 'shell.groupKnowledge',
    items: [
      { key: 'knowledge', icon: BookOpen, labelKey: 'nav.knowledge', segment: 'knowledge' },
      { key: 'agent', icon: Bot, labelKey: 'nav.agentConsultant', segment: 'agent' },
    ],
  },
  {
    labelKey: 'shell.groupSystem',
    items: [{ key: 'settings', icon: Settings, labelKey: 'nav.settings' }],
  },
];

const GLOBAL_HREFS: Partial<Record<SidebarNavKey, string>> = {
  dashboard: '/dashboard',
  projects: '/projects',
  settings: '/settings',
};

export function resolveSidebarHref(item: SidebarNavItem, projectId?: string | null): string {
  if (item.key === 'dashboard' || item.key === 'projects' || item.key === 'settings') {
    return GLOBAL_HREFS[item.key]!;
  }

  if (projectId && item.segment) {
    return `/projects/${projectId}/${item.segment}`;
  }

  return item.globalHref ?? '/dashboard';
}

export function isSidebarItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== '/dashboard' && href !== '/projects' && pathname.startsWith(`${href}/`)) {
    return true;
  }
  return false;
}
