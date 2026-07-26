'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { resolveFounderActionTitle } from '../../lib/founder-action-display';
import type { FounderSuccessScore, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';

type FounderTodayOutcomeStripProps = {
  score: FounderSuccessScore;
  primaryAction?: GeneratedTodayAction;
  className?: string;
};

export function FounderTodayOutcomeStrip({
  score,
  primaryAction,
  className,
}: FounderTodayOutcomeStripProps) {
  const t = useTranslations('workflow.founderAiPm.todayOutcome');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');
  const tk = useTranslations('workflow.founderAiPm.actionWorkspace.kinds');

  if (!primaryAction) return null;

  const afterScore = Math.min(100, score.percent + primaryAction.goImpact);
  const actionTitle = resolveFounderActionTitle(
    primaryAction,
    (key, params) => td(key as 'vocInterview', params),
    t('defaultAction'),
  );
  const kindKey = primaryAction.id.includes('pric')
    ? 'pricing'
    : primaryAction.id.includes('interview') || primaryAction.id.includes('voc')
      ? 'interview'
      : 'generic';

  return (
    <aside
      className={cn(
        'rounded-2xl border border-border/70 bg-muted/20 px-5 py-4',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('label')}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t('lead', {
          action: actionTitle,
          minutes: primaryAction.etaMinutes,
          before: score.percent,
          after: afterScore,
          focus: tk(kindKey),
        })}
      </p>
    </aside>
  );
}
