'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { AiPmInitialDiagnosis } from '../../lib/business-understanding/build-ai-pm-initial-diagnosis';

const STEP_MS = 520;
const FINISH_PAUSE_MS = 600;

type WorkspaceAiPmReadingSequenceProps = {
  diagnosis: AiPmInitialDiagnosis;
  onComplete: () => void;
  className?: string;
};

export function WorkspaceAiPmReadingSequence({
  diagnosis,
  onComplete,
  className,
}: WorkspaceAiPmReadingSequenceProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop.reading');
  const [completedSteps, setCompletedSteps] = useState(0);

  const visibleInsights = useMemo(
    () => diagnosis.insights.filter((insight) => completedSteps > insight.afterStepIndex),
    [completedSteps, diagnosis.insights],
  );

  useEffect(() => {
    if (completedSteps >= diagnosis.readingSteps.length) {
      const timer = window.setTimeout(onComplete, FINISH_PAUSE_MS);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setCompletedSteps((prev) => Math.min(prev + 1, diagnosis.readingSteps.length));
    }, STEP_MS);

    return () => window.clearTimeout(timer);
  }, [completedSteps, diagnosis.readingSteps.length, onComplete]);

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-background px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        {t('aiLabel')}
      </p>
      <p className="mt-3 text-[15px] font-medium leading-relaxed">{t('lead')}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t('hint')}</p>

      <ul className="mt-5 space-y-2.5">
        {diagnosis.readingSteps.map((step, index) => {
          const done = index < completedSteps;
          const active = index === completedSteps;
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
                done && 'bg-emerald-500/5',
                active && 'bg-primary/[0.06]',
              )}
            >
              {done ? (
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
              ) : active ? (
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden />
              ) : (
                <span className="mt-0.5 size-4 shrink-0 rounded-full border border-border" aria-hidden />
              )}
              <span className="min-w-0">
                <span className={cn('font-medium', !done && !active && 'text-muted-foreground')}>
                  {t(`steps.${step.id}`)}
                </span>
                {done && step.detail ? (
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {step.detail}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {visibleInsights.length > 0 ? (
        <div className="mt-5 space-y-2 border-t border-border/60 pt-4">
          {visibleInsights.map((insight) => (
            <p
              key={`${insight.template}-${insight.afterStepIndex}`}
              className="rounded-xl bg-muted/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground"
            >
              {insight.template === 'phraseMarketCheck' && insight.phrase
                ? t('insights.phraseMarketCheck', { phrase: insight.phrase })
                : null}
              {insight.template === 'domainCompare' && insight.domain
                ? t('insights.domainCompare', { domain: insight.domain })
                : null}
              {insight.template === 'buyerUserSplit' ? t('insights.buyerUserSplit') : null}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
