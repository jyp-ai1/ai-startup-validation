'use client';

import { ArrowRight, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type AiPmCompletionHandoffProps = {
  onStartToday: () => void;
  className?: string;
};

export function AiPmCompletionHandoff({ onStartToday, className }: AiPmCompletionHandoffProps) {
  const t = useTranslations('workflow.aiPm.completion');
  const td = useTranslations('workflow.aiPm.decision');

  const pipeline = loadAgentPipelineResult();
  const gap = pipeline?.decision?.intelligence?.gap ?? pipeline?.decision?.missingData?.[0];
  const primaryAction = pipeline?.founderOs?.todayActions?.[0];
  const successScore = pipeline?.founderOs?.successScore?.percent ?? pipeline?.decision?.confidence ?? 62;
  const afterScore = Math.min(100, successScore + (primaryAction?.goImpact ?? 4));
  const minutes = primaryAction?.etaMinutes ?? 15;
  const actionTitle = primaryAction?.title ?? t('defaultAction');

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-pm-complete-title"
    >
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <div className="space-y-4 text-center">
          <p id="ai-pm-complete-title" className="whitespace-pre-line text-lg font-semibold leading-relaxed">
            {t('doneHero')}
          </p>
          <p className="text-sm font-medium text-muted-foreground">{t('conclusionLead')}</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{td('headlineHold')}</p>
          {gap ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {t('riskLine', { gap })}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">{td('riskDefault')}</p>
          )}
        </div>

        <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-5 text-center">
          <p className="text-sm text-muted-foreground">{t('todayLead')}</p>
          <p className="mt-2 text-lg font-semibold leading-snug">{actionTitle}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {t('todayMeta', { minutes })}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" aria-hidden />
            <p className="text-xl font-bold tabular-nums">
              {successScore}% → {afterScore}%
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="h-14 w-full rounded-xl text-base font-semibold"
          onClick={onStartToday}
        >
          {t('cta')}
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
