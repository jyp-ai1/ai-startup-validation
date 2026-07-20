'use client';

import Link from 'next/link';
import { Calendar, FileText, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { formatRelativeTime } from '@repo/utils/date';

type DashboardTimelineProps = {
  stats: ProjectDashboardStats;
};

export function DashboardTimeline({ stats }: DashboardTimelineProps) {
  const t = useTranslations();
  const { project, timeline, recentActivity } = stats;

  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight">{t('dashboard.timeline.title')}</h2>

      <div className="mt-5 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <TimelineColumn title={t('dashboard.timeline.recentActivity')} icon={Sparkles}>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.noActivity')}</p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.slice(0, 5).map((item) => (
                <li key={item.id} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(new Date(item.occurredAt))}
                  </p>
                  <p className="text-sm font-medium">{t(`dashboard.activity.${item.type}`)}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.label}</p>
                </li>
              ))}
            </ul>
          )}
        </TimelineColumn>

        <TimelineColumn title={t('dashboard.timeline.recentDocs')} icon={FileText}>
          {timeline.recentDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.noActivity')}</p>
          ) : (
            <ul className="space-y-2">
              {timeline.recentDocuments.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/projects/${project.id}/reports`}
                    className="block rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(item.occurredAt))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TimelineColumn>

        <TimelineColumn title={t('dashboard.timeline.validationHistory')} icon={Sparkles}>
          {timeline.validationUpdatedAt ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {formatRelativeTime(new Date(timeline.validationUpdatedAt))}
              </p>
              <Link
                href={`/projects/${project.id}/validation/history`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t('dashboard.timeline.viewHistory')}
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('dashboard.noScoreHint')}</p>
          )}
        </TimelineColumn>

        <TimelineColumn title={t('dashboard.timeline.upcomingDeadlines')} icon={Calendar}>
          {timeline.upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.timeline.noDeadlines')}</p>
          ) : (
            <ul className="space-y-2">
              {timeline.upcomingDeadlines.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.deadline).toLocaleDateString()}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TimelineColumn>
      </div>
    </section>
  );
}

function TimelineColumn({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
