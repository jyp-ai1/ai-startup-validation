'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Check, Loader2 } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

const ROTATE_MS = 2200;

type AiThinkingOverlayProps = {
  goalLabel?: string;
  stepCount?: number;
  activeStep?: number;
  loadingMessage?: string;
  failed?: boolean;
  onRetry?: () => void;
  className?: string;
};

export function AiThinkingOverlay({
  goalLabel,
  stepCount = 4,
  activeStep = 0,
  loadingMessage,
  failed = false,
  onRetry,
  className,
}: AiThinkingOverlayProps) {
  const t = useTranslations('workflow.thinking');
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = [
    t('rotate.market'),
    t('rotate.workflow'),
    t('rotate.coach'),
    t('rotate.confidence'),
  ];

  useEffect(() => {
    const id = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [messages.length]);

  const steps = [
    t('steps.goalAnalysis'),
    t('steps.workflowBuild'),
    t('steps.coachPrep'),
    t('steps.workspaceCreate'),
  ];

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
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
            <Brain className="size-7 text-primary" aria-hidden />
          </span>
          <div>
            <p id="ai-thinking-title" className="text-lg font-semibold text-foreground">
              {t('title')}
            </p>
            {goalLabel ? (
              <p className="text-sm text-muted-foreground">{t('goalContext', { goal: goalLabel })}</p>
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
                  <li key={label} className="flex items-center gap-3 text-sm">
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
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, ((activeStep + 1) / stepCount) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {loadingMessage ?? messages[msgIndex]}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
