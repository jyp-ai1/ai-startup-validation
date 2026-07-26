'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Check, TrendingUp, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { Button, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ResolvedActionWorkspace } from '../../lib/founder-action-resolver';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

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
};

function resolveQuestionText(
  key: string,
  index: number,
  tq: ReturnType<typeof useTranslations>,
  pipelineQuestions?: string[],
): string {
  if (key.startsWith('pipeline_') && pipelineQuestions) {
    const pipelineIndex = Number(key.replace('pipeline_', '')) - 1;
    return pipelineQuestions[pipelineIndex] ?? tq('generic.q1');
  }
  return tq(`${key}`);
}

export function FounderActionWorkspace({
  workspace,
  scoreBefore,
  onComplete,
  onClose,
  className,
}: FounderActionWorkspaceProps) {
  const t = useTranslations('workflow.founderAiPm.actionWorkspace');
  const tk = useTranslations('workflow.founderAiPm.actionWorkspace.kinds');
  const tq = useTranslations('workflow.founderAiPm.actionWorkspace.questions');

  const pipeline = loadAgentPipelineResult();
  const pipelineQuestions = pipeline?.memory?.generatedAction?.questions;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [completedAnswers, setCompletedAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<'guide' | 'complete'>('guide');

  const totalSteps = workspace.questionKeys.length;
  const isLastStep = step >= totalSteps - 1;
  const scoreAfter = Math.min(100, scoreBefore + workspace.goImpact);

  const introMessages = useMemo(
    () => [t('intro'), t('stepIntro', { current: step + 1, total: totalSteps })],
    [step, t, totalSteps],
  );

  const currentQuestion = resolveQuestionText(
    workspace.questionKeys[step] ?? 'q1',
    step,
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
      setAnswers(nextAnswers);
      setCompletedAnswers(nextAnswers);
      setPhase('complete');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleFinish = () => {
    onComplete({
      actionId: workspace.actionId,
      title: workspace.title,
      kind: workspace.kind,
      goImpact: workspace.goImpact,
      answers: completedAnswers,
    });
  };

  if (phase === 'complete') {
    const summaryMessages = [
      t('completeLead'),
      t('completeSummary', { count: completedAnswers.length }),
      t('completeNext'),
    ];

    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm',
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="max-h-[92vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
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
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-workspace-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
              {tk(workspace.kind)}
            </p>
            <h2 id="action-workspace-title" className="mt-1 text-lg font-semibold leading-snug">
              {workspace.title}
            </h2>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              {t('meta', { minutes: workspace.etaMinutes, impact: workspace.goImpact })}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <AiPmConversation messages={introMessages} />

        <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-5">
          <p className="text-sm font-medium text-primary">
            {step + 1}. {t('questionLabel')}
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
      </div>
    </div>
  );
}
