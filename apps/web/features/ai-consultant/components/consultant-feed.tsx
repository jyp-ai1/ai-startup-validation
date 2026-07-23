'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

import { formatRelativeTime } from '@repo/utils/date';
import { cn } from '@repo/ui/lib/utils';

import type { ConsultantFeedItem } from '../services/consultant-types';

type ConsultantFeedProps = {
  feed: ConsultantFeedItem[];
};

const STATUS_ICON = {
  completed: CheckCircle2,
  running: Loader2,
  pending: Circle,
};

export function ConsultantFeed({ feed }: ConsultantFeedProps) {
  const t = useTranslations('aiConsultant');

  if (feed.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('feed.title')}
      </h3>
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {feed.map((item) => {
          const Icon = STATUS_ICON[item.status];
          return (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs"
            >
              <Icon
                className={cn(
                  'mt-0.5 size-3.5 shrink-0',
                  item.status === 'completed' && 'text-emerald-600',
                  item.status === 'running' && 'animate-spin text-primary',
                  item.status === 'pending' && 'text-muted-foreground',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="leading-snug">
                  {t(item.labelKey as 'feed.research', item.params as Record<string, string>)}
                </p>
                <p className="text-muted-foreground">{formatRelativeTime(new Date(item.occurredAt))}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
