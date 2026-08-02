'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { AiPmInitialDiagnosis, AiPmReadingInsight } from '../../lib/business-understanding/build-ai-pm-initial-diagnosis';
import { logG1LoopEvent } from '../../lib/business-understanding/g1-loop-instrumentation';

type WorkspaceAiPmReadingSequenceProps = {
  diagnosis: AiPmInitialDiagnosis;
  onComplete: () => void;
  className?: string;
};

function renderInsight(
  insight: AiPmReadingInsight,
  t: ReturnType<typeof useTranslations<'workflow.journey.workspaceShell.aiPmLoop.reading'>>,
): string | null {
  switch (insight.template) {
    case 'phraseMarketCheck':
      return insight.phrase ? t('insights.phraseMarketCheck', { phrase: insight.phrase }) : null;
    case 'domainCompare':
      return insight.domain ? t('insights.domainCompare', { domain: insight.domain }) : null;
    case 'buyerUserSplit':
      return t('insights.buyerUserSplit');
    case 'documentScope':
      return insight.sectionCount != null && insight.charCount != null
        ? t('insights.documentScope', {
            sections: insight.sectionCount,
            chars: insight.charCount,
          })
        : null;
    case 'competitorNamed':
      return insight.competitor
        ? t('insights.competitorNamed', { competitor: insight.competitor })
        : null;
    case 'revenueSignal':
      return insight.revenueSignal
        ? t('insights.revenueSignal', { signal: insight.revenueSignal })
        : null;
    default:
      return null;
  }
}

export function WorkspaceAiPmReadingSequence({
  diagnosis,
  onComplete,
  className,
}: WorkspaceAiPmReadingSequenceProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop.reading');
  const [completedSteps, setCompletedSteps] = useState(0);
  const { stepMs, finishPauseMs } = diagnosis.readingTiming;
  const readingStartedAt = useMemo(() => Date.now(), []);

  useEffect(() => {
    logG1LoopEvent({ event: 'reading_start', workspace: 'demo' });
  }, []);

  const visibleInsights = useMemo(
    () => diagnosis.insights.filter((insight) => completedSteps > insight.afterStepIndex),
    [completedSteps, diagnosis.insights],
  );

  useEffect(() => {
    if (completedSteps >= diagnosis.readingSteps.length) {
      const timer = window.setTimeout(() => {
        logG1LoopEvent({
          event: 'reading_end',
          workspace: 'demo',
          duration: Date.now() - readingStartedAt,
        });
        onComplete();
      }, finishPauseMs);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setCompletedSteps((prev) => Math.min(prev + 1, diagnosis.readingSteps.length));
    }, stepMs);

    return () => window.clearTimeout(timer);
  }, [completedSteps, diagnosis.readingSteps.length, finishPauseMs, onComplete, stepMs, readingStartedAt]);

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
      {diagnosis.documentStats?.previewLine ? (
        <p className="mt-2 text-sm text-foreground/90">
          {t('documentPreview', { line: diagnosis.documentStats.previewLine })}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">{t('hint')}</p>
      {diagnosis.documentStats ? (
        <p className="mt-1 text-xs text-muted-foreground/90">
          {t('documentScopeHint', {
            sections: diagnosis.documentStats.sectionCount,
            chars: diagnosis.documentStats.charCount,
          })}
        </p>
      ) : null}

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
          {visibleInsights.map((insight) => {
            const text = renderInsight(insight, t);
            if (!text) return null;
            return (
              <p
                key={`${insight.template}-${insight.afterStepIndex}`}
                className="rounded-xl bg-muted/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground"
              >
                {text}
              </p>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
