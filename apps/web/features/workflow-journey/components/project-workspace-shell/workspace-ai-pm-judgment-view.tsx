'use client';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { CeoJudgmentState } from '../../lib/business-understanding/ai-pm-ceo-judgment-dimensions';
import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  statusEmoji,
  type CeoJudgmentDimensionId,
} from '../../lib/business-understanding/ai-pm-ceo-judgment-dimensions';
import { judgmentViewTitle } from '../../lib/business-understanding/ai-pm-question-budget';

const DIMENSION_ORDER: CeoJudgmentDimensionId[] = [
  'customer',
  'problem',
  'solution',
  'customerChange',
];

export type WorkspaceAiPmJudgmentViewProps = {
  judgment: CeoJudgmentState;
  titleMode: 'interim' | 'result';
  className?: string;
  readOnly?: boolean;
  onContinueQuestions?: () => void;
  onFollowUpCheck?: () => void;
  onFinishReview?: () => void;
};

export function WorkspaceAiPmJudgmentView({
  judgment,
  titleMode,
  className,
  readOnly,
  onContinueQuestions,
  onFollowUpCheck,
  onFinishReview,
}: WorkspaceAiPmJudgmentViewProps) {
  const title = judgmentViewTitle(judgment.questionCount, titleMode);
  const canContinue =
    judgment.questionCount < 5 && titleMode === 'interim' && onContinueQuestions;

  return (
    <section
      data-testid="ai-pm-judgment-view"
      className={cn(
        'space-y-5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-4 py-4 sm:px-7 sm:py-5',
        className,
      )}
    >
      <h2
        data-testid="judgment-view-title"
        className="text-lg font-semibold text-foreground"
      >
        {title}
      </h2>

      <div data-testid="judgment-one-liner" className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          한 줄 사업 이해
        </p>
        <p className="text-sm leading-relaxed text-foreground">
          {judgment.oneLiner || '아직 사업의 핵심 윤곽을 정리하는 중입니다.'}
        </p>
      </div>

      <div data-testid="judgment-dimensions" className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          현재 판단
        </p>
        <ul className="space-y-2">
          {DIMENSION_ORDER.map((id) => {
            const dim = judgment.dimensions[id];
            return (
              <li
                key={id}
                data-testid={`judgment-dim-${id}`}
                className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {CEO_JUDGMENT_DIMENSION_LABELS[id]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {statusEmoji(dim.status)} {dim.status === 'clear' ? '명확' : dim.status === 'needs_check' ? '확인 필요' : '아직 모름'}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {dim.summary.trim() ||
                    (dim.status === 'unknown'
                      ? '구체적인 내용은 아직 확인되지 않음'
                      : dim.statusReason ?? '추가 확인 필요')}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <div data-testid="judgment-conclusion" className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          AI의 현재 결론
        </p>
        <p className="text-sm leading-relaxed text-foreground">{judgment.conclusion}</p>
      </div>

      {judgment.nextCheck ? (
        <div data-testid="judgment-next-check" className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            다음으로 확인할 것
          </p>
          <p className="text-sm leading-relaxed text-foreground">{judgment.nextCheck}</p>
          {onFollowUpCheck && !readOnly ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              data-testid="judgment-follow-up-cta"
              onClick={onFollowUpCheck}
            >
              이 부분 더 확인하기
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        {canContinue ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            data-testid="judgment-continue-questions-cta"
            onClick={onContinueQuestions}
          >
            질문 계속하기
          </Button>
        ) : null}
        {onFinishReview && !readOnly ? (
          <Button
            type="button"
            className="rounded-xl"
            data-testid="judgment-finish-review-cta"
            onClick={onFinishReview}
          >
            여기까지 검토하기
          </Button>
        ) : null}
      </div>
    </section>
  );
}
