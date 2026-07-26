'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import {
  buildCompetitiveGapMap,
  type CompetitiveGapDimension,
} from '../../lib/founder-validation-accuracy';
import type { BusinessProgressDimension } from '../../lib/founder-intelligence-engine';

type FounderCompetitiveGapMapProps = {
  businessProgress: BusinessProgressDimension[];
  className?: string;
};

function barBlocks(percent: number): string {
  const filled = Math.max(1, Math.round(percent / 12));
  return '■'.repeat(filled);
}

export function FounderCompetitiveGapMap({
  businessProgress,
  className,
}: FounderCompetitiveGapMapProps) {
  const t = useTranslations('workflow.founderAiPm.competitiveGap');
  const dimensions: CompetitiveGapDimension[] = buildCompetitiveGapMap(businessProgress);
  const weakest = [...dimensions].sort((a, b) => a.percent - b.percent)[0];

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <p className="text-base font-semibold">{t('title')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>

      <ul className="mt-5 space-y-3 font-mono text-sm" role="list">
        {dimensions.map((dim) => (
          <li key={dim.key} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-3">
            <span className="text-muted-foreground">{t(`dimensions.${dim.key}`)}</span>
            <span className="tracking-tight text-primary" aria-hidden>
              {barBlocks(dim.percent)}
            </span>
            <span className="text-right tabular-nums text-muted-foreground">{dim.percent}%</span>
          </li>
        ))}
      </ul>

      {weakest ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {t('recommendLead', { dimension: t(`dimensions.${weakest.key}`) })}
        </p>
      ) : null}
    </section>
  );
}
