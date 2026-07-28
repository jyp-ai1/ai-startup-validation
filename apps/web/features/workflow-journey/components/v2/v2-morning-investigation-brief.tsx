'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { MorningBriefing } from '../../lib/v2-investigation-types';

type V2MorningInvestigationBriefProps = {
  briefing: MorningBriefing;
  namespace?: 'investigation' | 'investigationSample';
  className?: string;
};

export function V2MorningInvestigationBrief({
  briefing,
  namespace = 'investigationSample',
  className,
}: V2MorningInvestigationBriefProps) {
  const t = useTranslations(`workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace}.morningBrief`);

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t('label')}</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed">{t('headline')}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t('meta', {
          scheduled: briefing.scheduledTime,
          completed: briefing.completedTime,
          minutes: briefing.durationMinutes,
        })}
      </p>
      <ul className="mt-3 space-y-1.5">
        {briefing.highlightKeys.map((key) => (
          <li key={key} className="text-sm leading-relaxed">
            {t(`highlights.${key}`)}
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-200">
        {t(`focus.${briefing.focusKey}`)}
      </p>
    </div>
  );
}
