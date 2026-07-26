'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { AiPmRecommendationBrief } from '../../lib/founder-ai-pm-meeting';

type FounderAiRecommendationPanelProps = {
  recommendation: AiPmRecommendationBrief;
  className?: string;
};

function renderStars(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
}

export function FounderAiRecommendationPanel({
  recommendation,
  className,
}: FounderAiRecommendationPanelProps) {
  const t = useTranslations('workflow.founderAiPm.meeting');

  return (
    <section
      className={cn(
        'rounded-2xl border border-violet-300/40 bg-gradient-to-br from-violet-500/[0.06] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('recommendation.label')}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-violet-600" aria-hidden />
        {t('recommendation.label')}
      </p>
      <p className="mt-3 text-2xl text-amber-500">{renderStars(recommendation.overallStars)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t('recommendation.reasonTitle')}</p>

      <ul className="mt-4 space-y-2" role="list">
        {recommendation.factors.map((factor) => (
          <li
            key={factor.key}
            className="flex items-center justify-between gap-3 rounded-lg bg-background/80 px-3 py-2 text-sm"
          >
            <span>{t(`recommendation.factors.${factor.key}`)}</span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t(`recommendation.levels.${factor.level}`)}
              </span>
              <span className="text-amber-500">{renderStars(factor.stars)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
