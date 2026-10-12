'use client';

import { cn } from '@repo/ui/lib/utils';

import type { AiPmSimpleQuestionSnapshot } from '../../lib/business-understanding/ai-pm-simple-question-presenter';

export type WorkspaceAiPmSimpleQuestionProps = {
  snapshot: AiPmSimpleQuestionSnapshot;
  className?: string;
  onShowInterimJudgment?: () => void;
};

/**
 * DAY 8-G — Minimal question surface: understanding + 1 question + guide.
 * Choice buttons live in the answer composer so submit stays one path.
 */
export function WorkspaceAiPmSimpleQuestion({
  snapshot,
  className,
  onShowInterimJudgment,
}: WorkspaceAiPmSimpleQuestionProps) {
  const facts = snapshot.facts ?? [];
  const assumptions = snapshot.assumptions ?? [];

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

      {snapshot.businessSummary ? (
        <div
          data-testid="business-understanding-summary"
          className="rounded-xl border border-border/60 bg-muted/15 px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            지금까지 이해한 사업
          </p>
          <p className="mt-1 text-sm leading-relaxed">{snapshot.businessSummary}</p>
        </div>
      ) : null}

      {facts.length > 0 || assumptions.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div data-testid="understood-facts" className="rounded-xl border border-border/50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              확인된 사실
            </p>
            {facts.length > 0 ? (
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                {facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">아직 확정된 사실은 없습니다.</p>
            )}
          </div>
          <div data-testid="unverified-assumptions" className="rounded-xl border border-border/50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              아직 불확실한 가정
            </p>
            {assumptions.length > 0 ? (
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                {assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">문서에서 읽은 가정은 없습니다.</p>
            )}
          </div>
        </div>
      ) : null}

      {snapshot.targetUnknown ? (
        <p data-testid="target-unknown" className="text-xs text-muted-foreground">
          지금 이해를 가장 크게 높일 미확인: {snapshot.targetUnknown}
        </p>
      ) : null}

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
