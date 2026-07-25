'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

export type JourneyWorkspaceTab =
  | 'today'
  | 'project'
  | 'workflow'
  | 'decision'
  | 'history'
  | 'settings';

const TABS: JourneyWorkspaceTab[] = [
  'today',
  'project',
  'workflow',
  'decision',
  'history',
  'settings',
];

type JourneyWorkspaceNavProps = {
  active: JourneyWorkspaceTab;
  onChange: (tab: JourneyWorkspaceTab) => void;
};

export function JourneyWorkspaceNav({ active, onChange }: JourneyWorkspaceNavProps) {
  const t = useTranslations('workflow.epic3.nav');

  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label={t('label')}
    >
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {t(tab)}
          </button>
        );
      })}
    </nav>
  );
}
