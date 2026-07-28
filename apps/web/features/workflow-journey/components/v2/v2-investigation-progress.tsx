'use client';

import { useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import { countWorkProgressDone } from '../../lib/v2-investigation-engine';
import type { WorkProgressItem } from '../../lib/v2-investigation-types';

type V2InvestigationProgressProps = {
  items: WorkProgressItem[];
  namespace?: 'investigation' | 'investigationSample';
  className?: string;
};

export function V2InvestigationProgress({
  items,
  namespace = 'investigationSample',
  className,
}: V2InvestigationProgressProps) {
  const t = useTranslations(`workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace}.workProgress`);
  const { done, total } = countWorkProgressDone(items);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className={cn('rounded-xl border border-border/40 bg-muted/5 p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('title')}
        </p>
        <span className="text-xs font-medium text-primary">
          {t('count', { done, total })}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            {item.status === 'done' ? (
              <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
            ) : item.status === 'inProgress' ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin text-amber-500" aria-hidden />
            ) : (
              <span className="size-3.5 shrink-0 rounded-full border border-muted-foreground/30" />
            )}
            <span className={item.status === 'pending' ? 'text-muted-foreground' : undefined}>
              {t(`items.${item.id}`)}
              {item.status === 'done' ? ` ${t('statusDone')}` : ''}
              {item.status === 'inProgress' ? ` ${t('statusInProgress')}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
