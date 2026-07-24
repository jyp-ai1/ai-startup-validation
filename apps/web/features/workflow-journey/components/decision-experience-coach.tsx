'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, History, Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  CONFIDENCE_GAINS_PREVIEW,
  CONFIDENCE_TIMELINE,
  DECISION_HISTORY,
  getDecisionStages,
  type DecisionStage,
} from '../constants/decision-experience';
import { HEALTH_DETAIL } from '../constants/intelligence-mock';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import type { WorkflowGoalId } from '../types';
import { ConfidenceMeter } from './confidence-meter';
import { EvidenceIntelligencePanel } from './evidence-intelligence-panel';

type DecisionExperienceCoachProps = {
  goalId: WorkflowGoalId;
  className?: string;
};

const VERDICT_STYLES = {
  GO: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  HOLD: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  'NO GO': 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200',
} as const;

function verdictEmoji(verdict: DecisionStage['verdict']) {
  if (verdict === 'GO') return '🟢';
  if (verdict === 'NO GO') return '🔴';
  return '🟡';
}

export function DecisionExperienceCoach({ goalId, className }: DecisionExperienceCoachProps) {
  const t = useTranslations('workflow.coach');
  const td = useTranslations('workflow.decisionExperience');
  const tp = useTranslations('workflow.plan.steps');
  const analytics = useJourneyAnalytics();

  const stages = getDecisionStages(goalId);
  const [stageIndex, setStageIndex] = useState(0);
  const [healthOpen, setHealthOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(true);

  const stage = stages[stageIndex] ?? stages[0]!;
  const isFinal = stageIndex >= stages.length - 1;
  const completedTimelineCount = stageIndex;

  const advanceStage = () => {
    if (!isFinal) {
      const next = Math.min(stageIndex + 1, stages.length - 1);
      const nextStage = stages[next]!;
      setStageIndex(next);
      analytics.trackMockActionCompleted(stage.mockActionKey, nextStage.confidence);
    }
  };

  const toggleHealth = () => {
    setHealthOpen((o) => {
      const next = !o;
      if (next) analytics.trackCoachClicked('health');
      return next;
    });
  };

  const toggleWhy = () => {
    setWhyOpen((o) => {
      const next = !o;
      if (next) analytics.trackWhyOpened(stage.verdict);
      return next;
    });
  };

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
        <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm leading-relaxed text-foreground/90">
          {stage.verdict === 'GO' ? td('coachTone.go') : td('coachTone.hold')}
        </div>

        {/* Dynamic Decision */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('currentDecision')}
          </p>
          <p
            className={cn(
              'mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
              VERDICT_STYLES[stage.verdict],
            )}
          >
            <span aria-hidden>{verdictEmoji(stage.verdict)}</span>
            {t(`verdict.${stage.verdict}`)}
          </p>
          {stageIndex > 0 ? (
            <p className="mt-1.5 text-xs text-muted-foreground">{td('decisionUpdated')}</p>
          ) : null}
        </div>

        {/* Confidence + Health */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
            <ConfidenceMeter
              value={stage.confidence}
              target={81}
              label={t('confidence')}
              className="confidence-gain-pop"
            />
          </div>
          <button
            type="button"
            onClick={toggleHealth}
            className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 text-left transition-colors hover:border-primary/40"
            aria-expanded={healthOpen}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('projectHealth')}
            </p>
            <p className="mt-0.5 flex items-center justify-between text-2xl font-bold tabular-nums text-foreground">
              {stage.projectHealth}
              {healthOpen ? (
                <ChevronUp className="size-4 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
              )}
            </p>
          </button>
        </div>

        {healthOpen ? (
          <div className="rounded-xl border border-border/60 bg-background/90 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {td('healthDetailTitle')}
            </p>
            <ul className="mt-2 space-y-2" role="list">
              {(Object.keys(HEALTH_DETAIL) as (keyof typeof HEALTH_DETAIL)[]).map((key) => {
                const value = HEALTH_DETAIL[key];
                const warn = value < 60;
                return (
                  <li key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{td(`health.${key}`)}</span>
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        warn ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
                      )}
                    >
                      {value}
                      {warn ? ' ⚠' : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* Confidence gains preview */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {td('gainsPreviewTitle')}
          </p>
          <ul className="mt-2 space-y-1.5" role="list">
            {CONFIDENCE_GAINS_PREVIEW.map((item, index) => {
              const done = index < completedTimelineCount;
              return (
                <li
                  key={item.labelKey}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-2 py-1.5 text-sm',
                    done ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'text-foreground',
                  )}
                >
                  <span>{td(`actions.${item.labelKey}`)}</span>
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    +{item.gain}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Confidence Timeline */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {td('timelineTitle')}
          </p>
          <ol className="mt-3 space-y-0" role="list">
            {CONFIDENCE_TIMELINE.map((step, index) => {
              const reached = index < completedTimelineCount;
              const active = index === completedTimelineCount && !isFinal;
              return (
                <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < CONFIDENCE_TIMELINE.length - 1 ? (
                    <span
                      className={cn(
                        'absolute left-[11px] top-6 h-full w-px',
                        reached ? 'bg-primary' : 'bg-border',
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={cn(
                      'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums',
                      reached
                        ? 'bg-primary text-primary-foreground'
                        : active
                          ? 'bg-primary/20 text-primary ring-2 ring-primary'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {step.to}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className={cn('text-sm font-medium', active ? 'text-primary' : 'text-foreground')}>
                      {td(`actions.${step.labelKey}`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.from}% → {step.to}% ({td('gainLabel', { gain: step.gain })})
                    </p>
                  </div>
                </li>
              );
            })}
            <li className="relative flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                81
              </span>
              <p className="pt-0.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {td('timelineGoal')}
              </p>
            </li>
          </ol>
        </div>

        {/* Next Action */}
        {!isFinal ? (
          <div className="rounded-xl border border-border/70 bg-background/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('nextActionLabel')}</p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {tp(`${stage.nextActionStepId}.title`)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('etaMinutes', { minutes: stage.nextActionDurationMinutes })}
            </p>
            <Button type="button" className="mt-4 w-full rounded-xl" size="sm" onClick={advanceStage}>
              {td(`mockActions.${stage.mockActionKey}`)}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{td('goReached')}</p>
          </div>
        )}

        {/* Why Drawer */}
        <div className="rounded-xl border border-border/60 bg-background/90">
          <button
            type="button"
            onClick={toggleWhy}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            aria-expanded={whyOpen}
          >
            <span className="text-sm font-semibold text-foreground">{t('whyTitle')}</span>
            {whyOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
            )}
          </button>
          {whyOpen ? (
            <div className="border-t border-border/60 px-4 pb-4">
              {stage.whyReasonKeys.length > 0 ? (
                <ul className="mt-3 space-y-1.5" role="list">
                  {stage.whyReasonKeys.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-600 dark:text-amber-400" aria-hidden>
                        •
                      </span>
                      {t(`whyReasons.${key}`)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{td('whyAllClear')}</p>
              )}
              <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {td('evidencePlaceholder')}
              </p>
            </div>
          ) : null}
        </div>

        <EvidenceIntelligencePanel
          evidenceOpen={whyOpen}
          completedRuleIds={[]}
          verdict={stage.verdict}
          confidenceValue={stage.confidence}
        />

        {/* Decision History */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <History className="size-3.5" aria-hidden />
            {td('historyTitle')}
          </p>
          <ol className="mt-2 space-y-2" role="list">
            {DECISION_HISTORY.slice(0, stage.historyCount).map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="shrink-0 text-xs text-muted-foreground">{td('historyToday')}</span>
                <span className="text-foreground">
                  {entry.verdict ? (
                    <>
                      <span className="font-semibold">{t(`verdict.${entry.verdict}`)}</span>
                      {' · '}
                    </>
                  ) : null}
                  {td(`historyEvents.${entry.eventKey}`)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </aside>
  );
}
