'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatRelativeTime } from '@repo/utils/date';

import { groupTimelineByBucket } from '../services/timeline-service';
import type { TimelineItem } from '../types';

type ExecutiveTimelinePanelProps = {
  projectId: string;
  items: TimelineItem[];
};

const BUCKET_ORDER = ['today', 'yesterday', 'thisWeek', 'earlier'] as const;

export function ExecutiveTimelinePanel({ projectId, items }: ExecutiveTimelinePanelProps) {
  const t = useTranslations('timeline');
  const grouped = groupTimelineByBucket(items);

  if (items.length === 0) return null;

  return (
    <section className="space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">{t('title')}</h2>
      </div>

      {BUCKET_ORDER.map((bucket) => {
        const bucketItems = grouped[bucket];
        if (bucketItems.length === 0) return null;

        return (
          <div key={bucket} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t(`buckets.${bucket}` as 'buckets.today')}
            </h3>
            <ul className="space-y-2">
              {bucketItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 rounded-lg border border-border/50 px-3 py-2 transition-colors hover:bg-muted/40"
                  >
                    <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      {t(`types.${item.memoryType.toLowerCase()}` as 'types.research')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      {item.summary ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {item.summary}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(item.occurredAt))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
