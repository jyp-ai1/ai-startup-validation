'use client';

import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { cn } from '@repo/ui/lib/utils';

type WelcomeChecklistProps = {
  stats: ProjectDashboardStats;
  projectId: string;
  className?: string;
};

type ChecklistItem = {
  id: string;
  labelKey: string;
  href: string;
  completed: boolean;
};

function buildItems(stats: ProjectDashboardStats, projectId: string): ChecklistItem[] {
  return [
    {
      id: 'project',
      labelKey: 'items.project',
      href: `/projects/${projectId}`,
      completed: true,
    },
    {
      id: 'research',
      labelKey: 'items.research',
      href: `/projects/${projectId}/research`,
      completed: stats.research.total > 0,
    },
    {
      id: 'evidence',
      labelKey: 'items.evidence',
      href: `/projects/${projectId}/evidence`,
      completed: stats.evidence.total > 0,
    },
    {
      id: 'decision',
      labelKey: 'items.decision',
      href: `/projects/${projectId}/validation`,
      completed: stats.validationScore !== null,
    },
    {
      id: 'report',
      labelKey: 'items.report',
      href: `/projects/${projectId}/reports`,
      completed: stats.recentActivity.some((a) => a.type === 'REPORT'),
    },
  ];
}

export function WelcomeChecklist({ stats, projectId, className }: WelcomeChecklistProps) {
  const t = useTranslations('activation.checklist');
  const items = buildItems(stats, projectId);

  return (
    <aside className={cn('rounded-xl border border-border/60 bg-card p-5', className)}>
      <h3 className="text-sm font-semibold">{t('title')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('desc')}</p>
      <ul className="mt-4 space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/60',
                item.completed && 'opacity-90',
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span>{t(item.labelKey as 'items.project')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
