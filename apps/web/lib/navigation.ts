import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  FileText,
  FlaskConical,
  Gauge,
  Landmark,
  LayoutDashboard,
  MessageSquareQuote,
  Search,
  Settings,
  Swords,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview of your startup validation progress.',
  },
  {
    label: 'Startup Projects',
    href: '/projects',
    icon: FlaskConical,
    description: 'Manage and create startup idea projects.',
  },
  {
    label: 'Research',
    href: '/research',
    icon: Search,
    description: 'Design and track market research plans.',
  },
  {
    label: 'Evidence',
    href: '/evidence',
    icon: FileText,
    description: 'Collect and organize supporting evidence.',
  },
  {
    label: 'Competitors',
    href: '/competitors',
    icon: Swords,
    description: 'Analyze competitive landscape.',
  },
  {
    label: 'VOC',
    href: '/voc',
    icon: MessageSquareQuote,
    description: 'Voice of Customer — customer problem analysis.',
  },
  {
    label: 'Government Grants',
    href: '/government-grants',
    icon: Landmark,
    description: 'Explore government support programs.',
  },
  {
    label: 'Validation Score',
    href: '/validation-score',
    icon: Gauge,
    description: 'GO / NO GO evaluation results.',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    description: 'AI-generated validation reports.',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Workspace and application settings.',
  },
];

export function getNavItem(href: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.href === href);
}
