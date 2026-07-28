'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { MorningBriefing } from '../../lib/v2-investigation-types';

type MorningBriefNamespace = 'investigation' | 'investigationSample' | 'firstInvestigation';

type V2MorningInvestigationBriefProps = {
  briefing: MorningBriefing;
  namespace?: MorningBriefNamespace;
  className?: string;
};

const FIRST_INVESTIGATION_HIGHLIGHTS = [
  'market',
  'competition',
  'searchVolume',
  'governmentGrant',
  'pricing',
  'revenueModel',
] as const;

export function V2MorningInvestigationBrief({
  briefing,
  namespace = 'investigationSample',
  className,
}: V2MorningInvestigationBriefProps) {
  const t = useTranslations(`workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace}.morningBrief`);
  const isFirst = namespace === 'firstInvestigation';
  const highlightKeys = isFirst ? FIRST_INVESTIGATION_HIGHLIGHTS : briefing.highlightKeys;

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t('label')}</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed">{t('headline')}</p>
      {!isFirst ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {t('meta', {
            scheduled: briefing.scheduledTime,
            completed: briefing.completedTime,
            minutes: briefing.durationMinutes,
          })}
        </p>
      ) : null}
      <ul className="mt-3 space-y-1.5">
        {highlightKeys.map((key) => (
          <li key={key} className="text-sm leading-relaxed">
            {t(`highlights.${key}`)}
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-200">
        {t(isFirst ? 'focus.complete' : `focus.${briefing.focusKey}`)}
      </p>
    </div>
  );
}
