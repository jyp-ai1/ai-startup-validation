'use client';

import { cn } from '@repo/ui/lib/utils';

import type { AiPmSimpleQuestionSnapshot } from '../../lib/business-understanding/ai-pm-simple-question-presenter';

export type WorkspaceAiPmSimpleQuestionProps = {
  snapshot: AiPmSimpleQuestionSnapshot;
  className?: string;
  onShowInterimJudgment?: () => void;
};

/**
 * DAY 8-G — Minimal question surface: 1 question + guide + collapsed why.
 */
export function WorkspaceAiPmSimpleQuestion({
  snapshot,
  className,
  onShowInterimJudgment,
}: WorkspaceAiPmSimpleQuestionProps) {
  return (
    <div
      data-testid="ai-pm-simple-question"
      className={cn('space-y-3', className)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {snapshot.screenTitle}
        </p>
        <p
          data-testid="question-progress-label"
          className="text-xs font-medium text-muted-foreground"
        >
          {snapshot.progressLabel}
        </p>
      </div>

      <p
        data-testid="simple-question-text"
        className="text-base font-medium leading-relaxed text-foreground"
      >
        {snapshot.questionText}
      </p>

      <p
        data-testid="answer-guide-text"
        className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground"
      >
        {snapshot.answerGuideText}
      </p>

      <details
        data-testid="why-question-details"
        className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3"
      >
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
          왜 이 질문을 하나요? ▾
        </summary>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {snapshot.whyQuestionSummary}
        </p>
      </details>

      {snapshot.showInterimJudgmentCta && onShowInterimJudgment ? (
        <button
          type="button"
          data-testid="show-interim-judgment-cta"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={onShowInterimJudgment}
        >
          현재 사업 판단 보기
        </button>
      ) : null}
    </div>
  );
}
