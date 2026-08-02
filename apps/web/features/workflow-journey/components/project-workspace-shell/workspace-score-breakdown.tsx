'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { WorkspaceScoreDimension } from '../../lib/build-workspace-review-score';

type WorkspaceScoreBreakdownProps = {
  total: number;
  dimensions: WorkspaceScoreDimension[];
  className?: string;
  size?: 'default' | 'compact';
};

export function WorkspaceScoreBreakdown({
  total,
  dimensions,
  className,
  size = 'default',
}: WorkspaceScoreBreakdownProps) {
  const t = useTranslations('workflow.journey.workspaceShell.overview');
  const [expanded, setExpanded] = useState(size === 'default');

  if (dimensions.length === 0) return null;

  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{t('scoreLabel')}</p>
        <p
          className={cn(
            'mt-2 font-bold tracking-tight tabular-nums',
            size === 'compact' ? 'text-3xl' : 'text-5xl',
          )}
        >
          {total}
          <span className="ml-1 text-xl font-medium text-muted-foreground">/100</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t('scoreBasisLead')}</p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
          aria-expanded={expanded}
        >
          {t('scoreBreakdownToggle')}
          <ChevronDown
            className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>
        {expanded ? (
          <ul className="space-y-2 border-t border-border/60 px-4 py-3">
            {dimensions.map((dimension) => (
              <li key={dimension.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{t(`scoreDimensions.${dimension.id}`)}</span>
                <span className="font-semibold tabular-nums">{dimension.score}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
