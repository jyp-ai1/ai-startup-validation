'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { useGuidedEmptyHint } from '@/components/consulting/use-guided-empty-hint';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { appToast, Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';
import { formatRelativeTime } from '@repo/utils/date';

import { dismissWatchNotification, readWatchNotification } from '../actions/watch-center-actions';
import type { TimelineBucket, WatchNotification } from '../types';

type NotificationInboxProps = {
  projectId: string;
  notifications: WatchNotification[];
  onChange?: () => void;
};

const PRIORITY_STYLES: Record<WatchNotification['priority'], string> = {
  CRITICAL: 'border-destructive/40 bg-destructive/5 text-destructive',
  WARNING: 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400',
  INFO: 'border-primary/30 bg-primary/5 text-primary',
  SUCCESS: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
};

function bucketFor(dateIso: string): TimelineBucket {
  const date = new Date(dateIso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400_000);
  const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 86400_000);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  if (date >= startOfWeek) return 'thisWeek';
  return 'earlier';
}

const BUCKET_ORDER: TimelineBucket[] = ['today', 'yesterday', 'thisWeek', 'earlier'];

export function NotificationInbox({ projectId, notifications, onChange }: NotificationInboxProps) {
  const t = useTranslations('watch');
  const tp = useTranslations('polish.toast');
  const { aiHint, aiGuideLabel } = useGuidedEmptyHint('notification');
  const { trackEvent } = useAnalytics();

  async function handleRead(notification: WatchNotification) {
    if (notification.read) return;
    await readWatchNotification(projectId, notification.id);
    appToast.success(tp('notificationRead'));
    trackEvent(ANALYTICS_EVENTS.notificationRead, {
      project_id: projectId,
      category: notification.category,
      priority: notification.priority,
    });
    onChange?.();
  }

  async function handleDismiss(notificationId: string) {
    await dismissWatchNotification(projectId, notificationId);
    appToast.success(tp('notificationDismissed'));
    onChange?.();
  }

  const grouped = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: notifications.filter((item) => bucketFor(item.occurredAt) === bucket),
  })).filter((group) => group.items.length > 0);

  if (notifications.length === 0) {
    return (
      <ConsultingEmptyState
        className="py-10"
        title={t('inbox.emptyTitle')}
        description={t('inbox.empty')}
        primaryLabel={t('inbox.emptyAction')}
        primaryHref={`/projects/${projectId}/research/new`}
        secondaryLabel={t('watchList.market')}
        secondaryHref={`/projects/${projectId}`}
        aiHint={aiHint}
        aiGuideLabel={aiGuideLabel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ bucket, items }) => (
        <section key={bucket} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t(`inbox.buckets.${bucket}`)}
          </p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'rounded-lg border px-4 py-3 transition-all duration-200 motion-safe:hover:shadow-sm',
                  item.read ? 'border-border/30 bg-muted/10' : 'border-primary/20 bg-primary/5',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          PRIORITY_STYLES[item.priority],
                        )}
                      >
                        {t(`priority.${item.priority}`)}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t(`category.${item.category}`)}
                      </span>
                    </div>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="mt-1 block text-sm font-medium hover:text-primary"
                        onClick={() => {
                          trackEvent(ANALYTICS_EVENTS.notificationClick, {
                            project_id: projectId,
                            category: item.category,
                          });
                          void handleRead(item);
                        }}
                      >
                        {t(item.titleKey as 'inbox.empty')}
                      </Link>
                    ) : (
                      <p className="mt-1 text-sm font-medium">{t(item.titleKey as 'inbox.empty')}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t(item.summaryKey as 'inbox.empty')}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {!item.read ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => void handleRead(item)}
                        >
                          {t('inbox.markRead')}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => void handleDismiss(item.id)}
                      >
                        <Trash2 className="mr-1 size-3" />
                        {t('inbox.dismiss')}
                      </Button>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatRelativeTime(new Date(item.occurredAt))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
