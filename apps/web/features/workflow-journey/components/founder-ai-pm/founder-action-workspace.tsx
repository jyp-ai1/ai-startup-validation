'use client';

import { useState } from 'react';
import { ArrowRight, Check, TrendingUp, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { Button, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ResolvedActionWorkspace } from '../../lib/founder-action-resolver';
import { resolveFounderActionTitle, normalizeFounderPipelineText } from '../../lib/founder-action-display';
import { resolveActionAnswerInsightKey } from '../../lib/founder-action-insights';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';
import { JourneyFocusedShell } from '../journey-focused-shell';
import { FounderExecutiveDecisionBoardLoader } from './founder-executive-decision-board-loader';
import type { WorkflowGoalId } from '../../types';

export type ActionWorkspaceResult = {
  actionId: string;
  title: string;
  kind: string;
  goImpact: number;
  answers: string[];
};

type FounderActionWorkspaceProps = {
  workspace: ResolvedActionWorkspace;
  scoreBefore: number;
  onComplete: (result: ActionWorkspaceResult) => void;
  onClose: () => void;
  className?: string;
  projectId?: string;
  projectName?: string;
  goalId?: WorkflowGoalId;
  confidence?: number;
};

function resolveQuestionText(
  key: string,
  tq: ReturnType<typeof useTranslations>,
  pipelineQuestions?: string[],
): string {
  if (key.startsWith('pipeline_') && pipelineQuestions) {
    const pipelineIndex = Number(key.replace('pipeline_', '')) - 1;
    const question = pipelineQuestions[pipelineIndex];
    return question ? normalizeFounderPipelineText(question) : tq('generic.q1');
  }
  return tq(`${key}`);
}

export function FounderActionWorkspace({
  workspace,
  scoreBefore,
  onComplete,
  onClose,
  className,
  projectId,
  projectName,
  goalId,
  confidence,
}: FounderActionWorkspaceProps) {
  const t = useTranslations('workflow.founderAiPm.actionWorkspace');
  const ti = useTranslations('workflow.founderAiPm.actionWorkspace.insights');
  const tk = useTranslations('workflow.founderAiPm.actionWorkspace.kinds');
  const tq = useTranslations('workflow.founderAiPm.actionWorkspace.questions');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');

  const pipeline = loadAgentPipelineResult();
  const pipelineQuestions = pipeline?.memory?.generatedAction?.questions;

  const actionTitle = resolveFounderActionTitle(
    {
      title: workspace.title,
      titleKey: workspace.titleKey,
      titleParams: workspace.titleParams,
    },
    (key, params) => td(key, params),
    workspace.title || td('primaryStep', { step: '1' }),
  );

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [completedAnswers, setCompletedAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<'guide' | 'complete'>('guide');
  const [saveFeedback, setSaveFeedback] = useState<string[] | null>(null);

  const totalSteps = workspace.questionKeys.length;
  const isLastStep = step >= totalSteps - 1;
  const scoreAfter = Math.min(100, scoreBefore + workspace.goImpact);

  const questionOrdinal = (num: number) =>
    t(`ordinals.${num}` as 'ordinals.1' | 'ordinals.2' | 'ordinals.3' | 'ordinals.4' | 'ordinals.5');

  const introMessages =
    step === 0
      ? workspace.kind === 'interview'
        ? [t('introInterview')]
        : [t('intro'), t('questionLead', { ordinal: questionOrdinal(step + 1) })]
      : [t('questionLead', { ordinal: questionOrdinal(step + 1) })];

  const currentQuestion = resolveQuestionText(
    workspace.questionKeys[step] ?? 'q1',
    tq,
    pipelineQuestions,
  );

  const handleRecord = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const nextAnswers = [...answers, trimmed];
    setAnswers(nextAnswers);
    setDraft('');

    if (isLastStep) {
      setCompletedAnswers(nextAnswers);
      setPhase('complete');
      return;
    }

    setSaveFeedback([
      t('savedFeedback'),
      ti(resolveActionAnswerInsightKey(workspace.kind, step)),
      t('nextQuestionFeedback'),
    ]);
    setStep((prev) => prev + 1);
  };

  const handleFinish = () => {
    onComplete({
      actionId: workspace.actionId,
      title: actionTitle,
      kind: workspace.kind,
      goImpact: workspace.goImpact,
      answers: completedAnswers,
    });
  };

  const strategyPanel =
    projectId && projectName && goalId && confidence != null ? (
      <FounderExecutiveDecisionBoardLoader
        projectId={projectId}
        projectName={projectName}
        goalId={goalId}
        confidence={confidence}
      />
    ) : null;

  if (phase === 'complete') {
    const summaryMessages = [
      t('completeLead'),
      t('completeSummary', { count: completedAnswers.length }),
      t('projectUpdated'),
      t('completeNext'),
    ];

    const completeRail = (
      <>
        <AiPmConversation messages={summaryMessages} />
        <div className="rounded-2xl border border-emerald-300/40 bg-emerald-50/50 p-5 text-center dark:bg-emerald-950/20">
          <p className="text-sm text-muted-foreground">{t('scoreLabel')}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" aria-hidden />
            <p className="text-2xl font-bold tabular-nums">
              {scoreBefore}% → {scoreAfter}%
            </p>
          </div>
          <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            +{workspace.goImpact}%
          </p>
        </div>
        <Button type="button" size="lg" className="h-14 w-full rounded-xl" onClick={handleFinish}>
          {t('completeCta')}
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
      </>
    );

    return (
      <JourneyFocusedShell
        ariaLabel={t('completeCta')}
        activeStep="execution"
        right={strategyPanel ?? undefined}
      >
        {completeRail}
      </JourneyFocusedShell>
    );
  }

  const actionRail = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
            {t('actionKindLabel', { kind: tk(workspace.kind) })}
          </p>
          <h2 id="action-workspace-title" className="mt-1 text-lg font-semibold leading-snug">
            {actionTitle}
          </h2>
          {workspace.kind === 'interview' ? (
            <p className="mt-1 text-sm text-muted-foreground">{t('interviewSubtitle')}</p>
          ) : null}
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {t('meta', { minutes: workspace.etaMinutes, impact: workspace.goImpact })}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={onClose}>
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      <AiPmConversation messages={introMessages} />

      {saveFeedback ? <AiPmConversation messages={saveFeedback} className="-mt-2" /> : null}

      <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-5">
        <p className="text-sm font-semibold text-primary">
          {t('questionPrefix', { ordinal: questionOrdinal(step + 1) })}
        </p>
        <p className="mt-2 text-base leading-relaxed">{currentQuestion}</p>

        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('answerPlaceholder')}
          className="mt-4 min-h-24 rounded-xl"
          autoFocus
        />

        <Button
          type="button"
          className="mt-4 w-full rounded-xl"
          disabled={!draft.trim()}
          onClick={handleRecord}
        >
          {isLastStep ? t('recordFinal') : t('record')}
        </Button>
      </div>

      {answers.length > 0 ? (
        <ul className="space-y-2" role="list">
          {answers.map((answer, index) => (
            <li
              key={`${index}-${answer.slice(0, 12)}`}
              className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
              <span className="text-muted-foreground">{answer}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        {t('progress', { current: step + 1, total: totalSteps })}
      </p>
    </>
  );

  return (
    <JourneyFocusedShell
      ariaLabel={t('label')}
      className={className}
      activeStep="execution"
      right={strategyPanel ?? undefined}
    >
      {actionRail}
    </JourneyFocusedShell>
  );
}
