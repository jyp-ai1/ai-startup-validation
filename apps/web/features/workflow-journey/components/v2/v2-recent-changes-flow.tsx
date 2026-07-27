'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import { MOCK_RECENT_CHANGE_FLOW } from '../../lib/v2-decision-story';

type V2RecentChangesFlowProps = {
  reviewCount: number;
  className?: string;
};

export function V2RecentChangesFlow({ reviewCount, className }: V2RecentChangesFlowProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.recentChanges');

  if (reviewCount === 0) return null;

  return (
    <section className={cn('space-y-3', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
      <div className="flex flex-wrap items-center gap-1 border-t border-border/40 pt-4 text-sm">
        {MOCK_RECENT_CHANGE_FLOW.map((item, index) => (
          <span key={item.id} className="inline-flex items-center gap-1">
            <span className="rounded-md bg-muted/40 px-2 py-1 text-xs font-medium">{item.label}</span>
            {index < MOCK_RECENT_CHANGE_FLOW.length - 1 ? (
              <ChevronDown className="size-3.5 rotate-[-90deg] text-muted-foreground" aria-hidden />
            ) : null}
          </span>
        ))}
      </div>
    </section>
  );
}
