'use client';

import { useState } from 'react';

import { cn } from '@repo/ui/lib/utils';

import type { SurfacePresenter } from '../../lib/business-understanding/surface-presenter-contract';

type WorkspaceS11SurfaceProps = {
  surface: SurfacePresenter;
  className?: string;
};

/**
 * S11 UI — Contract blocks only.
 * Summary default; Why (purpose) always visible on the current question.
 * Detail expands evidence/assumptions/action next — not a second Hero.
 */
export function WorkspaceS11Surface({ surface, className }: WorkspaceS11SurfaceProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const showQuestion = Boolean(surface.question.text.trim());

  return (
    <div data-testid="s11-surface" className={cn('space-y-6', className)}>
      <section data-testid="surface-understanding" aria-label="understanding">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">지금까지 이해한 내용</p>
          <button
            type="button"
            data-testid="s11-detail-toggle"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((v) => !v)}
          >
            {detailOpen ? '요약' : '자세히'}
          </button>
        </div>
        {surface.understanding.confirmed.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {surface.understanding.confirmed.map((line) => (
              <li key={`c-${line}`} className="flex gap-2 text-[15px] leading-relaxed">
                <span className="shrink-0 text-emerald-600" aria-hidden>
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {surface.understanding.assumptions.length > 0 ? (
          <ul
            className="mt-3 space-y-2"
            data-testid="surface-understanding-assumptions"
          >
            {surface.understanding.assumptions.map((item) => (
              <li
                key={`a-${item.value}`}
                className="space-y-1 text-[15px] leading-relaxed text-muted-foreground"
              >
                <p>
                  <span className="text-foreground">{item.value}</span>
                  <span className="ml-2 text-xs">(확인이 필요)</span>
                </p>
                {detailOpen ? <p className="text-sm">{item.reason}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {surface.understanding.confirmed.length === 0 &&
        surface.understanding.assumptions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">아직 확정된 이해는 없습니다.</p>
        ) : null}
      </section>

      <section data-testid="surface-decision" aria-label="decision" className="space-y-2">
        <p className="text-sm font-semibold text-foreground">지금 판단</p>
        {surface.decision.summary ? (
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {surface.decision.summary}
          </p>
        ) : null}
        {detailOpen &&
        surface.decision.blockingReason &&
        surface.decision.blockingReason !== surface.decision.summary ? (
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {surface.decision.blockingReason}
          </p>
        ) : null}
      </section>

      {showQuestion ? (
        <section data-testid="surface-question" aria-label="question" className="space-y-2">
          <p className="text-sm font-semibold text-foreground">이번 질문</p>
          <p className="text-[15px] font-medium leading-relaxed">{surface.question.text}</p>
          {surface.question.purpose ? (
            <p
              data-testid="surface-question-purpose"
              data-cpo-field="why-this-question-now"
              className="text-[15px] leading-relaxed text-muted-foreground"
            >
              <span className="font-medium text-foreground/80">왜 지금 이 질문 · </span>
              {surface.question.purpose}
            </p>
          ) : null}
        </section>
      ) : null}

      <section data-testid="surface-action" aria-label="action" className="space-y-2">
        <p className="text-sm font-semibold text-foreground">다음</p>
        {surface.action.current ? (
          <p className="text-[15px] leading-relaxed">{surface.action.current}</p>
        ) : null}
        {surface.action.reason ? (
          <p
            data-testid="surface-action-reason"
            className="text-[15px] leading-relaxed text-muted-foreground"
          >
            {surface.action.reason}
          </p>
        ) : null}
        {detailOpen && surface.action.next ? (
          <p className="text-[15px] leading-relaxed text-muted-foreground">{surface.action.next}</p>
        ) : null}
      </section>
    </div>
  );
}
