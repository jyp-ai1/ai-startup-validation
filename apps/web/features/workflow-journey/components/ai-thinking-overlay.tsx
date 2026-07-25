'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Check, Loader2 } from 'lucide-react';

import { useDialogA11y } from '@/hooks/use-dialog-a11y';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

const ROTATE_MS = 1800;

type AiThinkingOverlayProps = {
  goalLabel?: string;
  stepCount?: number;
  activeStep?: number;
  progressPercent?: number;
  loadingMessage?: string;
  stepLabels?: string[];
  titleOverride?: string;
  failed?: boolean;
  onRetry?: () => void;
  className?: string;
};

export function AiThinkingOverlay({
  goalLabel,
  stepCount = 4,
  activeStep = 0,
  progressPercent,
  loadingMessage,
  stepLabels,
  titleOverride,
  failed = false,
  onRetry,
  className,
}: AiThinkingOverlayProps) {
  const t = useTranslations('workflow.thinking');
  const panelRef = useDialogA11y({ open: true });
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = [
    t('rotate.building'),
    t('rotate.market'),
    t('rotate.competitor'),
    t('rotate.vcReview'),
    t('rotate.workflow'),
    t('rotate.coach'),
    t('rotate.confidence'),
    t('rotate.evidence'),
  ];

  const defaultSteps = [
    t('steps.goalAnalysis'),
    t('steps.workflowBuild'),
    t('steps.coachPrep'),
    t('steps.workspaceCreate'),
  ];
  const steps = stepLabels ?? defaultSteps;
  const displayStepCount = stepLabels?.length ?? stepCount;

  const pct =
    progressPercent ??
    Math.min(100, Math.round(((activeStep + 1) / displayStepCount) * 100));

  useEffect(() => {
    if (failed) return undefined;
    const id = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [failed, messages.length]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-thinking-title"
      aria-busy={!failed}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
            <Brain className="size-7 text-primary" aria-hidden />
          </span>
          <div>
            <p id="ai-thinking-title" className="text-lg font-semibold text-foreground">
              {titleOverride ?? t('title')}
            </p>
            {goalLabel ? (
              <p className="text-sm text-muted-foreground">{t('goalContext', { goal: goalLabel })}</p>
            ) : null}
            {!failed ? (
              <p className="mt-1 text-xs text-muted-foreground">{t('etaHint')}</p>
            ) : null}
          </div>
        </div>

        <div className="my-6 h-px bg-border" aria-hidden />

        {failed ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-destructive">{t('failed')}</p>
            {onRetry ? (
              <Button type="button" className="w-full rounded-xl" onClick={onRetry}>
                {t('retry')}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="space-y-3" role="list" aria-live="polite">
              {steps.map((label, index) => {
                const done = index < activeStep;
                const active = index === activeStep;
                return (
                  <li
                    key={label}
                    className={cn(
                      'flex items-center gap-3 text-sm motion-safe:transition-all motion-safe:duration-300',
                      active && 'thinking-step-active rounded-lg bg-primary/5 px-2 py-1',
                    )}
                  >
                    {done ? (
                      <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                    ) : active ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
                    ) : (
                      <span className="size-4 shrink-0 rounded-full border border-muted-foreground/40" aria-hidden />
                    )}
                    <span
                      className={cn(
                        done && 'text-muted-foreground line-through',
                        active && 'font-medium text-foreground',
                        !done && !active && 'text-muted-foreground',
                      )}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs font-medium tabular-nums text-muted-foreground">
                <span>{t('progressLabel')}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out motion-safe:animate-pulse"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p
                key={msgIndex}
                className="mt-3 text-center text-xs text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              >
                {loadingMessage ?? messages[msgIndex]}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
