'use client';

import { cn } from '@repo/ui/lib/utils';

import type { CeoSixSurfaces } from '../../lib/business-understanding/build-ceo-six-surfaces';
import { renderSurfaceFiveLines } from '../../lib/business-understanding/build-ceo-six-surfaces';

type WorkspaceCeoSixSurfacesProps = {
  surfaces: CeoSixSurfaces;
  className?: string;
};

/**
 * PR6 — CEO 6-surface post-answer UX (S17).
 * Surfaces ②–⑥ from persisted artifacts; no engine metadata exposed.
 */
export function WorkspaceCeoSixSurfaces({
  surfaces,
  className,
}: WorkspaceCeoSixSurfacesProps) {
  const whyLines = renderSurfaceFiveLines(surfaces.whyAsk);

  return (
    <div
      data-testid="ceo-six-surfaces"
      className={cn('mt-4 space-y-3', className)}
    >
      {surfaces.aiUnderstanding ? (
        <section
          data-testid="surface-ai-understanding"
          aria-label="AI가 이해한 내용"
          className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            AI가 이해한 내용
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {surfaces.aiUnderstanding}
          </p>
        </section>
      ) : null}

      {surfaces.confirmedFacts.length > 0 ? (
        <section
          data-testid="surface-confirmed-facts"
          aria-label="확인된 내용"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
            확인된 내용
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed">
            {surfaces.confirmedFacts.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {surfaces.unconfirmedItems.length > 0 ? (
        <section
          data-testid="surface-unconfirmed-gaps"
          aria-label="아직 확인되지 않은 내용"
          className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-200">
            아직 확인되지 않은 내용
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground">
            {surfaces.unconfirmedItems.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {whyLines.length > 0 ? (
        <section
          data-testid="surface-why-ask"
          aria-label="왜 이것을 묻는지"
          className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            왜 이것을 묻는지
          </p>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {whyLines.map((line, index) => (
              <p key={`${index}-${line.slice(0, 24)}`}>{line}</p>
            ))}
          </div>
        </section>
      ) : null}

      {surfaces.nextQuestion ? (
        <section
          data-testid="surface-next-question"
          aria-label="다음 질문"
          className="rounded-xl border border-primary/25 bg-primary/[0.03] px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            다음 질문
          </p>
          <p className="mt-2 text-base font-semibold leading-relaxed text-foreground">
            {surfaces.nextQuestion}
          </p>
        </section>
      ) : null}
    </div>
  );
}
