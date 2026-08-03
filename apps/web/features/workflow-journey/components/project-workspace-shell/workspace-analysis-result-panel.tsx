'use client';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { AnalysisScreenPresenter } from '../../lib/business-understanding/present-analysis-screen';

type WorkspaceAnalysisResultPanelProps = {
  presenter: AnalysisScreenPresenter;
  analyzing?: boolean;
  onCta?: () => void;
  className?: string;
};

/** S14 — Engine Decision · Insight · Recommended Action (Action · Why · CTA). */
export function WorkspaceAnalysisResultPanel({
  presenter,
  analyzing = false,
  onCta,
  className,
}: WorkspaceAnalysisResultPanelProps) {
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
        <p className="mt-4 text-[15px] leading-relaxed">시장성 분석 진행중…</p>
      </section>
    );
  }

  const recommended = presenter.recommended;

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-6 sm:px-8',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">AI PM</p>
      <h2 className="mt-3 text-lg font-semibold tracking-tight">{presenter.headline}</h2>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">현재 판단</p>
          <ul className="mt-2 space-y-1 text-[15px] leading-relaxed">
            {presenter.decisions.map((d) => (
              <li key={d.ruleId}>{d.summary}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground">근거</p>
          <ul className="mt-2 space-y-2 text-[15px] leading-relaxed">
            {presenter.insights.map((i) => (
              <li key={i.ruleId}>{i.claim}</li>
            ))}
          </ul>
        </div>

        {recommended ? (
          <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-4">
            <p className="text-xs font-semibold text-muted-foreground">추천</p>
            <p className="mt-2 text-[15px] font-medium leading-relaxed">{recommended.action}</p>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">이유</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{recommended.why}</p>
            <Button type="button" className="mt-4 rounded-xl" onClick={onCta}>
              {recommended.cta}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
