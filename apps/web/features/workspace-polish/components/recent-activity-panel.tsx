'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { DashboardActivity } from '@/features/dashboard/types';
import { formatRelativeTime } from '@repo/utils/date';

type RecentActivityPanelProps = {
  items: DashboardActivity[];
  projectId: string;
};

const TYPE_HREF: Record<string, string> = {
  RESEARCH: 'research',
  EVIDENCE: 'evidence',
  VOC: 'voc',
  COMPETITOR: 'competitors',
  VALIDATION: 'decision',
  REPORT: 'executive-report',
};

export function RecentActivityPanel({ items, projectId }: RecentActivityPanelProps) {
  const t = useTranslations('polish.activity');

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.slice(0, 8).map((item) => {
        const segment = TYPE_HREF[item.type] ?? '';
        const href = segment ? `/projects/${projectId}/${segment}` : `/projects/${projectId}`;

        return (
          <li key={item.id}>
            <Link
              href={href}
              className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card px-4 py-3 text-sm transition-all duration-200 hover:border-primary/30 hover:bg-muted/30 motion-safe:hover:-translate-y-0.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{t(`types.${item.type.toLowerCase()}` as 'types.research')}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelativeTime(new Date(item.occurredAt))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
