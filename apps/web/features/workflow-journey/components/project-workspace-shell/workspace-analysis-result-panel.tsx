'use client';

import { useMemo, useState } from 'react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  buildWhyFollowUp,
  type WhyFollowUp,
} from '../../lib/business-understanding/correction-and-why';
import type { AnalysisScreenPresenter } from '../../lib/business-understanding/present-analysis-screen';

type WorkspaceAnalysisResultPanelProps = {
  presenter: AnalysisScreenPresenter;
  analyzing?: boolean;
  /** E3 — Review Start failed: visible message + Retry (no silent fail) */
  reviewError?: string | null;
  onRetryReview?: () => void;
  onCta?: () => void;
  /** Return to Understanding / validation loop after Why */
  onReturnToLoop?: () => void;
  className?: string;
};

/**
 * Long Sprint W10 — Judgment → ≤3 reasons → 1 critical gap → Hero CTA exactly 1.
 * Secondary behind 「더보기」 (no extra Hero buttons). Score supporting only.
 * W8 — 「왜?」 explains evidence then returns to loop.
 */
export function WorkspaceAnalysisResultPanel({
  presenter,
  analyzing = false,
  reviewError = null,
  onRetryReview,
  onCta,
  onReturnToLoop,
  className,
}: WorkspaceAnalysisResultPanelProps) {
  const [showMore, setShowMore] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const hero = presenter.hero ?? presenter.recommended;
  const reasons = (presenter.reasons?.length ? presenter.reasons : presenter.evidence).slice(
    0,
    3,
  );
  const judgment = presenter.judgment || presenter.decisions[0]?.summary || presenter.headline;

  const why: WhyFollowUp = useMemo(
    () =>
      buildWhyFollowUp({
        judgment,
        reasons,
        criticalGap: presenter.criticalGap,
      }),
    [judgment, reasons, presenter.criticalGap],
  );

  if (reviewError) {
    return (
      <section
        data-testid="review-start-error"
        className={cn(
          'rounded-2xl border border-destructive/35 bg-destructive/[0.04] px-6 py-8 text-center',
          className,
        )}
        role="alert"
        aria-live="assertive"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-destructive">
          AI PM
        </p>
        <p className="mt-4 text-[15px] leading-relaxed">{reviewError}</p>
        {onRetryReview ? (
          <Button
            type="button"
            data-testid="review-start-retry"
            className="mt-5 rounded-xl"
            onClick={onRetryReview}
          >
            다시 시도
          </Button>
        ) : null}
      </section>
    );
  }

  if (analyzing) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-8 text-center',
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">AI PM</p>
        <p className="mt-4 text-[15px] leading-relaxed">지금 판단을 정리하고 있습니다…</p>
      </section>
    );
  }

  return (
    <section
      data-testid="analysis-result-evidence-first"
      className={cn(
        'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-6 sm:px-8',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">AI PM</p>

      <div className="mt-4 space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">현재 판단</p>
          <p
            data-testid="analysis-judgment"
            className="mt-2 text-[17px] font-semibold leading-snug tracking-tight"
          >
            {judgment}
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground">근거 (최대 3)</p>
            <button
              type="button"
              data-testid="analysis-why-toggle"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setWhyOpen((v) => !v)}
            >
              {whyOpen ? '요약' : '왜?'}
            </button>
          </div>
          <ul className="mt-2 space-y-2 text-[15px] leading-relaxed">
            {reasons.map((claim) => (
              <li key={claim}>{claim}</li>
            ))}
          </ul>
          {whyOpen ? (
            <div
              data-testid="analysis-why-panel"
              className="mt-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3"
            >
              <p className="text-sm leading-relaxed">{why.explanation}</p>
              {why.evidence.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {why.evidence.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              ) : null}
              {onReturnToLoop ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 rounded-xl"
                  onClick={onReturnToLoop}
                >
                  {why.returnToLoopCta}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {presenter.criticalGap ? (
          <div data-testid="analysis-critical-gap">
            <p className="text-xs font-semibold text-muted-foreground">핵심 공백 1</p>
            <p className="mt-2 text-[15px] font-medium leading-relaxed">{presenter.criticalGap}</p>
          </div>
        ) : null}

        {presenter.supportingScoreHint ? (
          <p
            data-testid="analysis-supporting-score"
            className="text-xs text-muted-foreground"
          >
            {presenter.supportingScoreHint}
          </p>
        ) : null}

        {hero ? (
          <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-4">
            <p className="text-xs font-semibold text-muted-foreground">지금 해야 할 일</p>
            <p className="mt-2 text-[15px] font-medium leading-relaxed">{hero.action}</p>
            {/* Decision Fatigue: exactly one Hero CTA — no sibling primary buttons */}
            <Button
              type="button"
              data-testid="analysis-hero-cta"
              className="mt-4 w-full rounded-xl sm:w-auto"
              onClick={onCta}
            >
              {hero.cta}
            </Button>
          </div>
        ) : null}

        {presenter.secondary.length > 0 ? (
          <div>
            <Button
              type="button"
              variant="ghost"
              className="h-auto px-0 text-sm text-muted-foreground"
              onClick={() => setShowMore((v) => !v)}
            >
              {showMore ? '접기' : `더 보기 (${presenter.secondary.length})`}
            </Button>
            {showMore ? (
              <ul className="mt-3 space-y-3 border-t border-border/50 pt-3 text-sm text-muted-foreground">
                {presenter.secondary.map((item) => (
                  <li key={item.ruleId}>
                    <p className="font-medium text-foreground/90">{item.action}</p>
                    <p className="mt-1">{item.why}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
