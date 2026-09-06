'use client';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { BusinessReviewResult } from '../../lib/business-understanding/ai-pm-business-review';
import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  CEO_JUDGMENT_STATUS_LABEL,
  statusEmoji,
  type CeoJudgmentDimensionId,
} from '../../lib/business-understanding/ai-pm-ceo-judgment-dimensions';

const DIMENSION_ORDER: CeoJudgmentDimensionId[] = [
  'customer',
  'problem',
  'solution',
  'customerChange',
];

export type WorkspaceAiPmBusinessReviewProps = {
  review: BusinessReviewResult;
  decisionShown: boolean;
  className?: string;
  readOnly?: boolean;
  onSupplement?: () => void;
  onContinueWithCurrentInfo?: () => void;
};

export function WorkspaceAiPmBusinessReview({
  review,
  decisionShown,
  className,
  readOnly,
  onSupplement,
  onContinueWithCurrentInfo,
}: WorkspaceAiPmBusinessReviewProps) {
  const showSupplement =
    review.primaryGapId != null &&
    review.readiness !== 'ready' &&
    onSupplement &&
    !readOnly;

  return (
    <section
      data-testid="ai-pm-business-review"
      className={cn(
        'space-y-5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-4 py-4 sm:px-7 sm:py-5',
        className,
      )}
    >
      <h2
        data-testid="business-review-title"
        className="text-lg font-semibold text-foreground"
      >
        현재 사업 검토
      </h2>

      <div data-testid="business-review-one-liner" className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          사업 한 줄
        </p>
        <p className="text-sm leading-relaxed text-foreground">
          {review.oneLiner || '아직 사업의 핵심 윤곽을 정리하는 중입니다.'}
        </p>
      </div>

      <div data-testid="business-review-dimensions" className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          현재 사업 이해
        </p>
        <ul className="space-y-2">
          {DIMENSION_ORDER.map((id) => {
            const dim = review.dimensions[id];
            return (
              <li
                key={id}
                data-testid={`business-review-dim-${id}`}
                className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {CEO_JUDGMENT_DIMENSION_LABELS[id]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {statusEmoji(dim.status)}{' '}
                    {CEO_JUDGMENT_STATUS_LABEL[dim.status]}
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

      <div data-testid="business-review-ai-judgment" className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          AI의 현재 판단
        </p>
        <p
          data-testid="business-review-readiness"
          className="text-sm font-medium text-foreground"
        >
          {review.readinessEmoji} {review.aiJudgmentHeadline.replace(/^[^\s]+\s/, '')}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {review.aiJudgmentBody}
        </p>
      </div>

      {review.primaryGapSummary ? (
        <div data-testid="business-review-primary-gap" className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            지금 가장 필요한 것
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {review.primaryGapSummary}
          </p>
          {review.primaryGapWhy ? (
            <details className="rounded-lg border border-border/40 bg-muted/5 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                왜 필요한가?
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {review.primaryGapWhy}
              </p>
            </details>
          ) : null}
        </div>
      ) : null}

      {decisionShown ? (
        <div
          data-testid="business-review-verdict"
          className="space-y-3 rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            현재 정보 기준 판단
          </p>
          <p
            data-testid="business-review-verdict-label"
            className="text-base font-semibold text-foreground"
          >
            {review.verdictEmoji} {review.verdictLabel}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {review.verdictExplanation}
          </p>
          <div data-testid="business-review-next-action" className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              다음 행동
            </p>
            <p className="text-sm leading-relaxed text-foreground">{review.nextAction}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        {showSupplement ? (
          <Button
            type="button"
            className="rounded-xl"
            data-testid="business-review-supplement-cta"
            onClick={onSupplement}
          >
            이 부분 보완하기
          </Button>
        ) : null}
        {onContinueWithCurrentInfo && !readOnly && !decisionShown ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            data-testid="business-review-continue-cta"
            onClick={onContinueWithCurrentInfo}
          >
            현재 정보로 계속 검토
          </Button>
        ) : null}
      </div>
    </section>
  );
}
