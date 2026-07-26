'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { AiPmConversation } from '../ai-state/ai-pm-conversation';

const LOG_STEP_MS = 1100;

type FounderAiPmLiveWorkPanelProps = {
  actionTitle: string;
  onComplete: () => void;
  className?: string;
};

export function FounderAiPmLiveWorkPanel({
  actionTitle,
  onComplete,
  className,
}: FounderAiPmLiveWorkPanelProps) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo.liveWork');
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [done, setDone] = useState(false);

  const logKeys = ['marketResearch', 'competitorCompare', 'pricingDraft'] as const;

  useEffect(() => {
    const timers: number[] = [];
    logKeys.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => setVisibleSteps(index + 1), LOG_STEP_MS * (index + 1)),
      );
    });
    timers.push(
      window.setTimeout(() => setDone(true), LOG_STEP_MS * (logKeys.length + 1)),
    );
    timers.push(
      window.setTimeout(onComplete, LOG_STEP_MS * (logKeys.length + 1) + 900),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [onComplete]);

  const now = new Date();
  const timeLabel = (offsetMinutes: number) => {
    const d = new Date(now);
    d.setMinutes(d.getMinutes() + offsetMinutes);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.06] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{t('label')}</p>
      <AiPmConversation messages={[t('startLead', { action: actionTitle })]} />

      <ul className="mt-5 space-y-0" role="list">
        {logKeys.slice(0, visibleSteps).map((key, index) => (
          <li key={key} className="border-t border-border/60 py-3 first:border-t-0 first:pt-0">
            <p className="text-xs tabular-nums text-muted-foreground">{timeLabel(index)}</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium">
              {index === visibleSteps - 1 && !done ? (
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
              ) : (
                <Check className="size-4 text-emerald-600" aria-hidden />
              )}
              {t(`steps.${key}`)}
            </p>
          </li>
        ))}
      </ul>

      {done ? (
        <p className="mt-4 rounded-xl border border-emerald-300/40 bg-emerald-500/[0.06] px-4 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          {t('completeLead')}
        </p>
      ) : null}
    </section>
  );
}
