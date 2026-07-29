'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { OverviewBlockId } from './workspace-shell-types';

const BLOCK_ORDER: OverviewBlockId[] = [
  'score',
  'summary',
  'nextStep',
  'risk',
  'recommendation',
];

type WorkspaceProgressiveOverviewProps = {
  businessScore: number | null;
  reviewCount: number;
  /** Domain lifecycle progress — drives progressive reveal (P1) */
  completedTopics?: number;
  className?: string;
};

function resolveVisibleBlockCount(reviewCount: number, completedTopics: number): number {
  if (reviewCount > 0) return BLOCK_ORDER.length;
  if (completedTopics >= 5) return 4;
  if (completedTopics >= 4) return 3;
  if (completedTopics >= 3) return 2;
  if (completedTopics >= 2) return 1;
  return 0;
}

export function WorkspaceProgressiveOverview({
  businessScore,
  reviewCount,
  completedTopics = 0,
  className,
}: WorkspaceProgressiveOverviewProps) {
  const t = useTranslations('workflow.v2.workspaceShell.overview');
  const [visibleCount, setVisibleCount] = useState(0);

  const targetCount = resolveVisibleBlockCount(reviewCount, completedTopics);

  useEffect(() => {
    setVisibleCount(0);
    if (targetCount === 0) return;

    const timers: number[] = [];
    for (let i = 0; i < targetCount; i += 1) {
      timers.push(
        window.setTimeout(() => {
          setVisibleCount(i + 1);
        }, (i + 1) * 400),
      );
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [targetCount, reviewCount, completedTopics]);

  const isVisible = (id: OverviewBlockId) =>
    BLOCK_ORDER.indexOf(id) < visibleCount;

  if (targetCount === 0) {
    return (
      <div className={cn('py-12 text-center text-sm text-muted-foreground', className)}>
        {t('empty')}
      </div>
    );
  }

  return (
    <div className={cn('max-w-[640px] space-y-10 py-2', className)}>
      {isVisible('score') ? (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-xs font-medium text-muted-foreground">{t('scoreLabel')}</p>
          <p className="mt-2 text-5xl font-bold tracking-tight tabular-nums">
            {businessScore ?? '…'}
            <span className="ml-1 text-xl font-medium text-muted-foreground">/100</span>
          </p>
        </section>
      ) : null}

      {isVisible('summary') ? (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('summaryLabel')}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed">{t('summaryBody')}</p>
        </section>
      ) : null}

      {isVisible('nextStep') ? (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-xs font-semibold text-muted-foreground">{t('nextStepLabel')}</p>
          <p className="mt-2 flex items-center gap-2 text-base font-medium">
            <span className="text-muted-foreground">→</span>
            {t('nextStepAction')}
          </p>
          <Button type="button" size="sm" className="mt-4">
            {t('nextStepCta')}
          </Button>
        </section>
      ) : null}

      {isVisible('risk') ? (
        <details className="animate-in fade-in border-t border-border/60 pt-6 duration-300">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {t('riskLabel')}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('riskBody')}</p>
        </details>
      ) : null}

      {isVisible('recommendation') ? (
        <details className="animate-in fade-in border-t border-border/60 pt-6 duration-300">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {t('recommendationLabel')}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t('recommendationBody')}
          </p>
        </details>
      ) : null}
    </div>
  );
}
