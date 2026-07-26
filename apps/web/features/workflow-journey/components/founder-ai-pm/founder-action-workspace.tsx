'use client';

import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { Button, Textarea } from '@repo/ui';

import type { ResolvedActionWorkspace } from '../../lib/founder-action-resolver';
import { resolveFounderActionTitle, normalizeFounderPipelineText } from '../../lib/founder-action-display';
import { resolveActionAnswerInsightKey } from '../../lib/founder-action-insights';
import { AiPmOfficeChat, type AiPmChatMessage } from '../ai-state/ai-pm-office-chat';
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

  const currentQuestion = resolveQuestionText(
    workspace.questionKeys[step] ?? 'q1',
    tq,
    pipelineQuestions,
  );

  const chatMessages = useMemo((): AiPmChatMessage[] => {
    const messages: AiPmChatMessage[] = [
      {
        role: 'ai',
        text: workspace.kind === 'interview' ? t('introInterview') : t('intro'),
      },
      { role: 'ai', text: t('actionStart', { action: actionTitle }) },
    ];

    for (let i = 0; i < answers.length; i += 1) {
      const questionKey = workspace.questionKeys[i] ?? 'q1';
      messages.push({
        role: 'ai',
        text: resolveQuestionText(questionKey, tq, pipelineQuestions),
      });
      messages.push({ role: 'founder', text: answers[i]! });
    }

    if (phase === 'guide') {
      messages.push({ role: 'ai', text: currentQuestion });
    }

    if (saveFeedback) {
      for (const line of saveFeedback) {
        messages.push({ role: 'ai', text: line });
      }
    }

    if (phase === 'complete') {
      messages.push(
        { role: 'ai', text: t('completeLead') },
        { role: 'ai', text: t('scoreNarrative', { before: scoreBefore, after: scoreAfter }) },
        { role: 'ai', text: t('completeNext') },
      );
    }

    return messages;
  }, [
    actionTitle,
    answers,
    currentQuestion,
    phase,
    pipelineQuestions,
    saveFeedback,
    scoreAfter,
    scoreBefore,
    t,
    tq,
    workspace.kind,
    workspace.questionKeys,
  ]);

  const handleRecord = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const nextAnswers = [...answers, trimmed];
    setAnswers(nextAnswers);
    setDraft('');

    if (isLastStep) {
      setCompletedAnswers(nextAnswers);
      setPhase('complete');
      setSaveFeedback(null);
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

  const chatFooter =
    phase === 'complete' ? (
      <Button type="button" size="lg" className="h-12 w-full rounded-xl font-semibold" onClick={handleFinish}>
        {t('completeCta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
    ) : (
      <div className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('answerPlaceholder')}
          className="min-h-20 rounded-xl"
          autoFocus
        />
        <div className="flex gap-2">
          <Button type="button" className="flex-1 rounded-xl" disabled={!draft.trim()} onClick={handleRecord}>
            {isLastStep ? t('recordFinal') : t('record')}
          </Button>
          <Button type="button" variant="ghost" className="rounded-xl" onClick={onClose}>
            {t('closeCta')}
          </Button>
        </div>
      </div>
    );

  return (
    <JourneyFocusedShell
      ariaLabel={t('label')}
      className={className}
      activeStep="execution"
      right={strategyPanel ?? undefined}
    >
      <AiPmOfficeChat messages={chatMessages} footer={chatFooter} />
    </JourneyFocusedShell>
  );
}
