'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import type { DecisionResult } from '@/features/decision';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import { DecisionScoreGrid } from './decision-score-grid';
import { DecisionVerdictBadge } from './decision-verdict-badge';

type DecisionSummaryPanelProps = {
  decision: DecisionResult;
  projectId: string;
  projectTitle: string;
  detailHref: string;
  variant?: 'dashboard' | 'compact';
};

export function DecisionSummaryPanel({
  decision,
  projectId,
  projectTitle,
  detailHref,
  variant = 'dashboard',
}: DecisionSummaryPanelProps) {
  const t = useTranslations('decision');
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.decisionView, {
      project_id: projectId,
      project_type: decision.projectType,
      screen: variant === 'dashboard' ? '/dashboard' : detailHref,
      status: decision.verdict,
    });
  }, [decision, detailHref, projectId, trackEvent, variant]);

  return (
    <section className="ll-executive-panel space-y-8 px-8 py-10 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border/50 pb-8">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ai">
            {t('summaryEyebrow')}
          </p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-tight md:text-2xl">
            {t('summaryTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{projectTitle}</p>
        </div>
        <DecisionVerdictBadge verdict={decision.verdict} size="lg" />
      </div>

      <DecisionScoreGrid scores={decision.scores} compact={variant === 'compact'} />

      <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-4">
        <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {t('coverage.title')}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {decision.explanation.evidenceCoverage.overallPercent}%
        </p>
      </div>

      <div className="space-y-3">
        {decision.executiveSummaryKeys.slice(0, variant === 'compact' ? 2 : 4).map((key) => (
          <p key={key} className="text-[15px] leading-relaxed text-foreground/90">
            {t(key as 'executive.insufficient1')}
          </p>
        ))}
      </div>

      {decision.recommendedActions.length > 0 ? (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('topAction')}
          </p>
          <p className="mt-2 font-medium">
            {t(decision.recommendedActions[0]!.labelKey as 'actions.voc10.label')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('scoreImpactShort', { points: decision.recommendedActions[0]!.scoreImpact })}
            {' · '}
            {t('daysShort', { days: decision.recommendedActions[0]!.estimatedDays })}
          </p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button variant="outline" className="h-11" asChild>
          <Link href={detailHref}>
            {t('openDecisionCenter')}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
