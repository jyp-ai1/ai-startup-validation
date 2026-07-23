'use client';

import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';

import type { ExecutiveInboxItem } from '../services/executive-types';
import { cn } from '@repo/ui/lib/utils';
import { formatRelativeTime } from '@repo/utils/date';

type ExecutiveInboxProps = {
  items: ExecutiveInboxItem[];
};

export function ExecutiveInbox({ items }: ExecutiveInboxProps) {
  const t = useTranslations('executive');

  return (
    <section className="space-y-4 rounded-xl border border-border/50 bg-card p-6">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">{t('inbox.title')}</h2>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {items.filter((i) => !i.read).length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'rounded-lg border px-4 py-3',
              item.read ? 'border-border/30 bg-muted/10' : 'border-primary/20 bg-primary/5',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t(item.titleKey as 'inbox.marketGrowth.title')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(item.summaryKey as 'inbox.marketGrowth.summary')}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatRelativeTime(new Date(item.occurredAt))}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
