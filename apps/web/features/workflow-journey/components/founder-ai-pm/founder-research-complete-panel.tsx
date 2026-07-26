'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ResearchCompleteBrief } from '../../lib/founder-research-trust';

type FounderResearchCompletePanelProps = {
  brief: ResearchCompleteBrief;
  className?: string;
};

export function FounderResearchCompletePanel({ brief, className }: FounderResearchCompletePanelProps) {
  const t = useTranslations('workflow.founderAiPm.researchTrust');

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-emerald-300/40 bg-gradient-to-br from-emerald-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('complete.label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="size-3.5" aria-hidden />
        {t('complete.label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('complete.title')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('complete.subtitle', {
          count: brief.materialCount,
          domains: brief.completedDomains.slice(0, 4).join(' · '),
        })}
      </p>
      {brief.providerId === 'openrouter' ? (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{t('complete.liveResearch')}</p>
      ) : null}
    </section>
  );
}
