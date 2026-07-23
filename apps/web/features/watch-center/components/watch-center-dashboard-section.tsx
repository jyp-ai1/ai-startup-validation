'use client';

import { Bell, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { cn } from '@repo/ui/lib/utils';

import type { WatchCenterViewModel } from '../types';
import { openWatchCenter } from './watch-center-trigger';

type WatchCenterDashboardSectionProps = {
  viewModel: WatchCenterViewModel;
  className?: string;
};

const PRIORITY_DOT: Record<WatchCenterViewModel['notifications'][number]['priority'], string> = {
  CRITICAL: 'bg-destructive',
  WARNING: 'bg-amber-500',
  INFO: 'bg-primary',
  SUCCESS: 'bg-emerald-500',
};

export function WatchCenterDashboardSection({
  viewModel,
  className,
}: WatchCenterDashboardSectionProps) {
  const t = useTranslations('watch');
  const { trackEvent } = useAnalytics();
  const topItems = viewModel.notifications.filter((item) => !item.read).slice(0, 4);

  return (
    <section className={cn('space-y-4 rounded-xl border border-border/50 bg-card p-6', className)}>
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">{t('dashboard.title')}</h2>
        {viewModel.unreadCount > 0 ? (
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {viewModel.unreadCount}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold">{t(viewModel.aiSummary.headlineKey)}</p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {viewModel.aiSummary.bullets.map((bullet) => (
            <li key={bullet.id}>{t(bullet.labelKey, { count: bullet.count ?? 0 })}</li>
          ))}
        </ul>
      </div>

      <ul className="space-y-2">
        {topItems.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-border/40 px-4 py-3"
          >
            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', PRIORITY_DOT[item.priority])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t(item.titleKey as 'inbox.empty')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(item.summaryKey as 'inbox.empty')}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
        onClick={() => {
          trackEvent(ANALYTICS_EVENTS.notificationView, {
            project_id: viewModel.projectId,
            screen: 'dashboard',
          });
          openWatchCenter();
        }}
      >
        {t('dashboard.openCenter')}
        <ChevronRight className="size-4" />
      </button>
    </section>
  );
}
