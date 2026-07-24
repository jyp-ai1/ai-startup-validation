'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { StrategyCoachState } from '../constants/decision-mock';
import { getConfidenceDelta } from '../constants/decision-mock';

type AiStrategyCoachProps = {
  state: StrategyCoachState;
  className?: string;
};

const VERDICT_STYLES = {
  GO: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  HOLD: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  'NO GO': 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200',
} as const;

export function AiStrategyCoach({ state, className }: AiStrategyCoachProps) {
  const t = useTranslations('workflow.coach');
  const tp = useTranslations('workflow.plan.steps');
  const delta = getConfidenceDelta(state);

  return (
    <aside
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/8 to-card p-5 shadow-sm',
        'lg:sticky lg:top-6 lg:self-start',
        className,
      )}
      aria-label={t('panelLabel')}
    >
      <div className="flex items-center gap-2 border-b border-border/60 pb-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{t('title')}</p>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('currentDecision')}
          </p>
          <p
            className={cn(
              'mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold',
              VERDICT_STYLES[state.verdict],
            )}
          >
            <span aria-hidden>{state.verdict === 'HOLD' ? '🟡' : state.verdict === 'GO' ? '🟢' : '🔴'}</span>
            {t(`verdict.${state.verdict}`)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('confidence')}
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{state.confidence}%</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('projectHealth')}
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{state.projectHealth}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('confidenceProgress')}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
            <span>{state.confidence}%</span>
            <span>{t('confidenceAfter', { value: state.confidenceAfterAction })}</span>
          </div>
          <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/30"
              style={{ width: `${state.confidenceAfterAction}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${state.confidence}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('confidenceDelta', { delta: `+${delta}` })}
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('nextActionLabel')}</p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {tp(`${state.nextActionStepId}.title`)}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('eta')}</dt>
              <dd className="font-medium tabular-nums">
                {t('etaMinutes', { minutes: state.nextActionDurationMinutes })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('afterComplete')}</dt>
              <dd className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                {state.confidenceAfterAction}%
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{t('whyTitle')}</p>
          <ul className="mt-2 space-y-1.5" role="list">
            {state.whyReasonKeys.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden>
                  ✓
                </span>
                {t(`whyReasons.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
