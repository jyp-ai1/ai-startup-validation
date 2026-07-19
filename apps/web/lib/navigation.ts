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

export type NavItemKey =
  | 'dashboard'
  | 'projects'
  | 'research'
  | 'evidence'
  | 'competitors'
  | 'voc'
  | 'grants'
  | 'validation'
  | 'reports'
  | 'settings';

export type NavItemConfig = {
  key: NavItemKey;
  href: string;
  icon: LucideIcon;
  labelKey: `nav.${NavItemKey}` | 'nav.grants' | 'nav.validation';
  descKey: `${NavItemConfig['labelKey']}Desc`;
};

export const NAV_ITEM_CONFIGS: NavItemConfig[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', descKey: 'nav.dashboardDesc' },
  { key: 'projects', href: '/projects', icon: FlaskConical, labelKey: 'nav.projects', descKey: 'nav.projectsDesc' },
  { key: 'research', href: '/research', icon: Search, labelKey: 'nav.research', descKey: 'nav.researchDesc' },
  { key: 'evidence', href: '/evidence', icon: FileText, labelKey: 'nav.evidence', descKey: 'nav.evidenceDesc' },
  { key: 'competitors', href: '/competitors', icon: Swords, labelKey: 'nav.competitors', descKey: 'nav.competitorsDesc' },
  { key: 'voc', href: '/voc', icon: MessageSquareQuote, labelKey: 'nav.voc', descKey: 'nav.vocDesc' },
  { key: 'grants', href: '/government-grants', icon: Landmark, labelKey: 'nav.grants', descKey: 'nav.grantsDesc' },
  { key: 'validation', href: '/validation-score', icon: Gauge, labelKey: 'nav.validation', descKey: 'nav.validationDesc' },
  { key: 'reports', href: '/reports', icon: BarChart3, labelKey: 'nav.reports', descKey: 'nav.reportsDesc' },
  { key: 'settings', href: '/settings', icon: Settings, labelKey: 'nav.settings', descKey: 'nav.settingsDesc' },
];

export function getNavItemConfig(href: string): NavItemConfig | undefined {
  return NAV_ITEM_CONFIGS.find((item) => item.href === href);
}

/** @deprecated Use NAV_ITEM_CONFIGS with useTranslations */
export const NAV_ITEMS = NAV_ITEM_CONFIGS.map((item) => ({
  label: item.key,
  href: item.href,
  icon: item.icon,
  description: item.descKey,
}));

export function getNavItem(href: string) {
  return NAV_ITEMS.find((item) => item.href === href);
}
