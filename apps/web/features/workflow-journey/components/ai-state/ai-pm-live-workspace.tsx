'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  buildAiPmWorkItems,
  estimateRemainingSeconds,
  getMicroQuestionId,
  getStepEtaSeconds,
} from '../../lib/ai-pm-conversation';
import {
  loadFounderMicroAnswers,
  saveFounderMicroAnswer,
} from '../../lib/founder-micro-interaction-store';
import { AiPmMicroQuestion } from './ai-pm-micro-question';

type AiPmLiveWorkspaceProps = {
  agentIndex: number;
  failed?: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
  onSkipToToday?: () => void;
  className?: string;
};

function WorkStatusIcon({ status }: { status: 'done' | 'running' | 'waiting' | 'failed' }) {
  if (status === 'done') return <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />;
  if (status === 'running')
    return <span className="size-2.5 shrink-0 rounded-full bg-amber-500" aria-hidden />;
  if (status === 'failed') return <X className="size-4 shrink-0 text-destructive" aria-hidden />;
  return (
    <span className="size-2.5 shrink-0 rounded-full border border-muted-foreground/50" aria-hidden />
  );
}

export function AiPmLiveWorkspace({
  agentIndex,
  failed = false,
  onRetry,
  onCancel,
  onSkipToToday,
  className,
}: AiPmLiveWorkspaceProps) {
  const t = useTranslations('workflow.aiPm');
  const tw = useTranslations('workflow.aiPm.work');
  const tr = useTranslations('workflow.aiPm.reasoning');
  const remaining = estimateRemainingSeconds(agentIndex);
  const workItems = buildAiPmWorkItems(agentIndex, failed);
  const microQuestionId = getMicroQuestionId(agentIndex);
  const [microAnswers, setMicroAnswers] = useState(loadFounderMicroAnswers);
  const progressPercent = Math.min(
    100,
    Math.round(((agentIndex + 1) / 5) * 100),
  );

  const handleMicroSelect = (value: NonNullable<(typeof microAnswers)['targetCustomer']>) => {
    saveFounderMicroAnswer('targetCustomer', value);
    setMicroAnswers({ ...microAnswers, targetCustomer: value });
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-pm-live-title"
      aria-busy={!failed}
    >
      <div className="max-h-[92vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-4 text-center">
          <p id="ai-pm-live-title" className="whitespace-pre-line text-base font-semibold leading-relaxed sm:text-lg">
            {t('liveHero')}
          </p>
          {!failed ? (
            <p className="mt-3 text-sm tabular-nums text-muted-foreground">
              {t('remaining', { seconds: remaining })}
            </p>
          ) : null}
        </div>

        {!failed ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('progressLabel')}</span>
              <span className="font-medium tabular-nums">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        <ul className="space-y-2.5" role="list" aria-live="polite">
          {workItems.map((item) => {
            const isRunning = item.status === 'running';
            const stepEta = isRunning ? getStepEtaSeconds(item.id) : null;

            return (
              <li
                key={item.id}
                className={cn(
                  'rounded-xl border border-border/60 px-4 py-3',
                  isRunning && 'border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20',
                  item.status === 'done' && 'text-muted-foreground',
                )}
              >
                <div className="flex items-start gap-3">
                  <WorkStatusIcon status={item.status} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', isRunning && 'text-foreground')}>
                      {tw(`${item.id}.${item.status}`)}
                    </p>
                    {isRunning && item.id !== 'ideaUnderstood' ? (
                      <>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {tr(item.id)}
                        </p>
                        {stepEta != null ? (
                          <p className="mt-1 text-xs font-medium tabular-nums text-primary">
                            {t('stepEta', { seconds: stepEta })}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {microQuestionId && !failed ? (
          <AiPmMicroQuestion
            questionId={microQuestionId}
            selected={microAnswers.targetCustomer}
            onSelect={handleMicroSelect}
          />
        ) : null}

        {failed ? (
          <div className="space-y-3">
            <p className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {t('failedHint')}
            </p>
            <Button type="button" className="w-full rounded-xl" onClick={onRetry}>
              {t('retry')}
            </Button>
            {onSkipToToday ? (
              <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onSkipToToday}>
                {t('continueAnyway')}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 border-t border-border/60 pt-4">
            <p className="whitespace-pre-line text-center text-sm leading-relaxed text-muted-foreground">
              {t('waitInstruction')}
            </p>
            {onCancel ? (
              <Button type="button" variant="ghost" className="w-full rounded-xl text-muted-foreground" onClick={onCancel}>
                {t('cancelAnalysis')}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
