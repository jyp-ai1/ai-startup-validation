'use client';

import { useState } from 'react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { AnalysisScreenPresenter } from '../../lib/business-understanding/present-analysis-screen';

type WorkspaceAnalysisResultPanelProps = {
  presenter: AnalysisScreenPresenter;
  analyzing?: boolean;
  onCta?: () => void;
  className?: string;
};

/**
 * S15 — Judgment → Evidence (≤3) → Hero Action (1 CTA).
 * Secondary actions behind 「더보기」. Score is not the hero.
 */
export function WorkspaceAnalysisResultPanel({
  presenter,
  analyzing = false,
  onCta,
  className,
}: WorkspaceAnalysisResultPanelProps) {
  const [showMore, setShowMore] = useState(false);
  const hero = presenter.hero ?? presenter.recommended;
  const evidence = presenter.evidence?.length
    ? presenter.evidence
    : presenter.insights.map((i) => i.claim).slice(0, 3);
  const judgment = presenter.judgment || presenter.decisions[0]?.summary || presenter.headline;

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
      className={cn(
        'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-6 sm:px-8',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">AI PM</p>

      <div className="mt-4 space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">현재 판단</p>
          <p className="mt-2 text-[17px] font-semibold leading-snug tracking-tight">{judgment}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground">근거</p>
          <ul className="mt-2 space-y-2 text-[15px] leading-relaxed">
            {evidence.map((claim) => (
              <li key={claim}>{claim}</li>
            ))}
          </ul>
        </div>

        {hero ? (
          <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-4">
            <p className="text-xs font-semibold text-muted-foreground">지금 해야 할 일</p>
            <p className="mt-2 text-[15px] font-medium leading-relaxed">{hero.action}</p>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">왜</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{hero.why}</p>
            <Button type="button" className="mt-4 w-full rounded-xl sm:w-auto" onClick={onCta}>
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
