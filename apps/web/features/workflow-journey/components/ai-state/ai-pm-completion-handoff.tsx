'use client';

import { ArrowRight, Check, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { buildAiPmWorkItems } from '../../lib/ai-pm-conversation';
import { AiPmConversation } from './ai-pm-conversation';

type AiPmCompletionHandoffProps = {
  onStartToday: () => void;
  className?: string;
};

export function AiPmCompletionHandoff({ onStartToday, className }: AiPmCompletionHandoffProps) {
  const t = useTranslations('workflow.aiPm.completion');
  const td = useTranslations('workflow.aiPm.decision');
  const tw = useTranslations('workflow.aiPm.work');

  const pipeline = loadAgentPipelineResult();
  const verdict = pipeline?.decision?.verdict ?? 'HOLD';
  const gap = pipeline?.decision?.intelligence?.gap ?? pipeline?.decision?.missingData?.[0];
  const primaryAction = pipeline?.founderOs?.todayActions?.[0];
  const successScore = pipeline?.founderOs?.successScore?.percent ?? pipeline?.decision?.confidence ?? 62;
  const afterScore = Math.min(100, successScore + (primaryAction?.goImpact ?? 4));
  const minutes = primaryAction?.etaMinutes ?? 15;
  const impact = primaryAction?.goImpact ?? 4;
  const actionTitle = primaryAction?.title;

  const headlineKey =
    verdict === 'GO' ? 'headlineGo' : verdict === 'NO_GO' ? 'headlineNoGo' : 'headlineHold';

  const messages = [
    t('greeting'),
    t('resultIntro'),
    td(headlineKey),
    gap ? td('riskFollowUp', { gap }) : td('riskDefault'),
    actionTitle
      ? td('recommendAction', { action: actionTitle, minutes, impact })
      : td('recommendDefault', { minutes, impact }),
  ];

  const completedItems = buildAiPmWorkItems(4);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/92 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-pm-complete-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Sparkles className="size-5 text-emerald-600" aria-hidden />
          </span>
          <div>
            <p id="ai-pm-complete-title" className="text-lg font-semibold">
              {t('title')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>

        <AiPmConversation messages={messages} />

        <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5">
          <p className="text-sm font-medium text-muted-foreground">{t('investmentLabel')}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('investmentMinutes', { minutes })}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-2.5">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="size-3.5" aria-hidden />
                {t('successScore')}
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {successScore}% → {afterScore}%
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-2.5">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" aria-hidden />
                {t('expectedGain')}
              </dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-primary">+{impact}%</dd>
            </div>
          </dl>
        </div>

        <ul
          className="space-y-2 rounded-xl border border-emerald-200/50 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          role="list"
        >
          {completedItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
              {tw(`${item.id}.done`)}
            </li>
          ))}
        </ul>

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
