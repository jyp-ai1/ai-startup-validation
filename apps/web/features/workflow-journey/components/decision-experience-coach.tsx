'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, History, Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  CONFIDENCE_GAINS_PREVIEW,
  DECISION_HISTORY,
  getDecisionStages,
  type DecisionStage,
} from '../constants/decision-experience';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useJourneyHistory } from '../hooks/use-journey-history';
import { unlockAchievement } from '../lib/journey-achievements-store';
import { computeFounderAiPmBrief } from '../lib/founder-ai-pm-engine';
import type { WorkflowGoalId } from '../types';
import { ConfidenceBreakdownPanel } from './founder-ai-pm/confidence-breakdown-panel';
import { EvidenceThoughtTimeline } from './founder-ai-pm/evidence-thought-timeline';
import { FounderAiSummary } from './founder-ai-pm/founder-ai-summary';
import { NextActionRewardPanel } from './founder-ai-pm/next-action-reward-panel';
import { WhatIfScenarioPanel } from './founder-ai-pm/what-if-scenario-panel';
import { ConfidenceMeter } from './confidence-meter';
import { EvidenceEngineDrawer } from './evidence-engine-drawer';
import { EvidenceIntelligencePanel } from './evidence-intelligence-panel';
import { GoCelebrationOverlay } from './go-celebration-overlay';
import { ProjectHealthVisual } from './project-health-visual';

type DecisionExperienceCoachProps = {
  goalId: WorkflowGoalId;
  projectId: string;
  className?: string;
  id?: string;
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

export function DecisionExperienceCoach({ goalId, projectId, className, id }: DecisionExperienceCoachProps) {
  const t = useTranslations('workflow.coach');
  const td = useTranslations('workflow.decisionExperience');
  const tp = useTranslations('workflow.plan.steps');
  const analytics = useJourneyAnalytics();
  const { entries, append } = useJourneyHistory(projectId);

  const decisionHistory = entries.filter((entry) => entry.category === 'decision').slice(0, 6);

  const stages = getDecisionStages(goalId);
  const [stageIndex, setStageIndex] = useState(0);
  const [healthOpen, setHealthOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [verdictTransition, setVerdictTransition] = useState(false);
  const celebratedRef = useRef(false);
  const holdPathTrackedRef = useRef(-1);

  const stage = stages[stageIndex] ?? stages[0]!;
  const founderBrief = computeFounderAiPmBrief(stage, stageIndex);
  const isFinal = stageIndex >= stages.length - 1;
  const completedTimelineCount = stageIndex;

  useEffect(() => {
    if (!isFinal || stage.verdict !== 'GO' || celebratedRef.current) return;
    celebratedRef.current = true;
    unlockAchievement('first-go');
    const timer = window.setTimeout(() => setShowCelebration(true), 400);
    analytics.trackGoReached(goalId, stage.confidence);
    return () => clearTimeout(timer);
  }, [analytics, goalId, isFinal, stage.confidence, stage.verdict]);

  useEffect(() => {
    if (stage.verdict === 'GO' || !stage.primaryHoldReasonKey || isFinal) return;
    if (holdPathTrackedRef.current === stageIndex) return;
    holdPathTrackedRef.current = stageIndex;
    analytics.trackHoldPathViewed(stage.verdict, stage.confidence);
  }, [
    analytics,
    isFinal,
    stage.confidence,
    stage.primaryHoldReasonKey,
    stage.verdict,
    stageIndex,
  ]);

  const advanceStage = () => {
    if (!isFinal) {
      const next = Math.min(stageIndex + 1, stages.length - 1);
      const nextStage = stages[next]!;
      const historySeed = DECISION_HISTORY[next];
      if (historySeed) {
        append({
          category: 'decision',
          title: historySeed.eventKey,
          value: historySeed.verdict ?? nextStage.verdict,
          summary: `${nextStage.confidence}%`,
        });
      }
      const actionCategory =
        stage.mockActionKey === 'completeVoc'
          ? 'evidence'
          : stage.mockActionKey === 'done'
            ? 'decision'
            : 'workflow';
      append({
        category: actionCategory,
        title: stage.mockActionKey,
        summary: tp(stage.nextActionStepId as 'market'),
      });
      setVerdictTransition(true);
      setStageIndex(next);
      analytics.trackMockActionCompleted(stage.mockActionKey, nextStage.confidence);
      window.setTimeout(() => setVerdictTransition(false), 500);
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
    <>
      <GoCelebrationOverlay open={showCelebration} onDismiss={() => setShowCelebration(false)} />
      <aside
        id={id}
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
        <FounderAiSummary brief={founderBrief} />

        {/* Dynamic Decision */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('currentDecision')}
          </p>
          <p
            className={cn(
              'mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
              VERDICT_STYLES[stage.verdict],
              verdictTransition && 'confidence-gain-pop',
            )}
          >
            <span aria-hidden>{verdictEmoji(stage.verdict)}</span>
            {t(`verdict.${stage.verdict}`)}
          </p>
          {stageIndex > 0 ? (
            <p className="mt-1.5 text-xs text-muted-foreground">{td('decisionUpdated')}</p>
          ) : null}
        </div>

        {stage.verdict !== 'GO' && stage.primaryHoldReasonKey ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              {td('holdWhyHeadline')}
            </p>
            <p className="mt-1.5 text-base font-semibold leading-snug text-amber-950 dark:text-amber-50">
              {td(`holdWhySummary.${stage.primaryHoldReasonKey}`)}
            </p>
            {stage.whyReasonKeys.length > 1 ? (
              <ul className="mt-2 space-y-1" role="list">
                {stage.whyReasonKeys
                  .filter((key) => key !== stage.primaryHoldReasonKey)
                  .map((key) => (
                    <li key={key} className="text-sm text-amber-900/90 dark:text-amber-100/90">
                      · {t(`whyReasons.${key}`)}
                    </li>
                  ))}
              </ul>
            ) : null}
            <p className="mt-2 text-xs text-amber-800/90 dark:text-amber-200/80">{td('holdWhyHint')}</p>
            {!isFinal ? (
              <div className="mt-3 border-t border-amber-300/60 pt-3 dark:border-amber-700">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                  {td('holdPathTitle')}
                </p>
                <p className="mt-1.5 text-sm font-medium text-amber-950 dark:text-amber-50">
                  {td('holdNextAction', { action: tp(`${stage.nextActionStepId}.title`) })}
                </p>
                <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                  {td('holdExpectedGain', {
                    gain: founderBrief.nextAction.confidenceGain,
                    minutes: stage.nextActionDurationMinutes,
                  })}
                </p>
                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/70">
                  {td('holdTrustNote')}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Confidence + Breakdown */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
            <ConfidenceMeter
              value={stage.confidence}
              target={81}
              label={t('confidence')}
              gamified
              className="confidence-gain-pop"
            />
          </div>
          <ConfidenceBreakdownPanel items={founderBrief.confidenceBreakdown} total={stage.confidence} />
        </div>

        <button
          type="button"
          onClick={toggleHealth}
          className="w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 text-left transition-colors hover:border-primary/40"
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

        {healthOpen ? (
          <div className="rounded-xl border border-border/60 bg-background/90 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {td('healthDetailTitle')}
            </p>
            <ProjectHealthVisual className="mt-3" />
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

        {/* Evidence thought timeline — AI reasoning flow */}
        <EvidenceThoughtTimeline steps={founderBrief.evidenceThoughtSteps} />

        {/* What If scenario */}
        {founderBrief.whatIf && !isFinal ? (
          <WhatIfScenarioPanel
            scenario={founderBrief.whatIf}
            onSimulate={() => analytics.trackCoachClicked('what_if')}
          />
        ) : null}

        {/* Next Action with rewards */}
        {!isFinal ? (
          <NextActionRewardPanel
            actionTitle={tp(`${stage.nextActionStepId}.title`)}
            brief={founderBrief}
            actionLabel={td(`mockActions.${stage.mockActionKey}`)}
            onAction={advanceStage}
          />
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{td('goReached')}</p>
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full rounded-xl"
              onClick={() => setShowCelebration(true)}
            >
              {td('viewCelebration')}
            </Button>
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <EvidenceIntelligencePanel
            evidenceOpen={stage.verdict !== 'GO' || whyOpen}
            completedRuleIds={[]}
            verdict={stage.verdict}
            confidenceValue={stage.confidence}
          />
          <EvidenceEngineDrawer
            verdict={stage.verdict}
            confidenceValue={stage.confidence}
            completedRuleIds={[]}
          />
        </div>

        {/* Decision History */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <History className="size-3.5" aria-hidden />
            {td('historyTitle')}
          </p>
          <ol className="mt-2 space-y-2" role="list">
            {decisionHistory.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="shrink-0 text-xs text-muted-foreground">{td('historyToday')}</span>
                <span className="text-foreground">
                  {entry.value ? (
                    <>
                      <span className="font-semibold">{t(`verdict.${entry.value}` as 'verdict.GO')}</span>
                      {' · '}
                    </>
                  ) : null}
                  {td(`historyEvents.${entry.title}` as 'historyEvents.startedHold')}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </aside>
    </>
  );
}
