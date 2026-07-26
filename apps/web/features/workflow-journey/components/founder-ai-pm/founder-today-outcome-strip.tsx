'use client';

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

  const outcomes = [
    t('outcomes.validation', { focus: tk(kindKey) }),
    t('outcomes.scoreGain', { delta: afterScore - score.percent }),
    t('outcomes.nextTasks'),
  ];

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
      <ul className="mt-3 space-y-2" role="list">
        {outcomes.map((outcome) => (
          <li key={outcome} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
              ✔
            </span>
            <span>{outcome}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
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
