'use client';

import type { ReactNode } from 'react';

import { cn } from '@repo/ui/lib/utils';

import {
  buildCeoSixSurfaces,
  renderSurfaceFiveLines,
  type CeoSixSurfaces,
} from '../../lib/business-understanding/build-ceo-six-surfaces';
import type { NextQuestionDecision } from '../../lib/business-understanding/decide-next-question-from-review';
import type { AiPmLoopState, AiPmLoopTurn } from '../../lib/business-understanding/workspace-ai-pm-loop-types';

export type WorkspaceCeoSixSurfacesProps = {
  lastTurn: AiPmLoopTurn | null;
  loop: AiPmLoopState;
  lastDecision?: NextQuestionDecision | null;
  className?: string;
};

function SurfaceBlock({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section data-testid={testId} aria-label={label} className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

/** PR6 — CEO 6-surface presenter (S17). Renders persisted review/decision artifacts only. */
export function WorkspaceCeoSixSurfaces({
  lastTurn,
  loop,
  lastDecision,
  className,
}: WorkspaceCeoSixSurfacesProps) {
  const surfaces: CeoSixSurfaces = buildCeoSixSurfaces({
    lastTurn,
    gapState: loop.gapState,
    lastDecision: lastDecision ?? loop.lastDecision ?? null,
    lockedAskSurface: loop.lockedAskSurface,
    loop,
  });

  const whyLines = renderSurfaceFiveLines(surfaces.whyAsk);

  return (
    <div data-testid="ceo-six-surfaces" className={cn('space-y-4', className)}>
      <SurfaceBlock label="내 답변" testId="ceo-surface-user-answer">
        {surfaces.userAnswer ?? '—'}
      </SurfaceBlock>
      <SurfaceBlock label="AI가 이해한 내용" testId="ceo-surface-ai-understanding">
        {surfaces.aiUnderstanding ?? '—'}
      </SurfaceBlock>
      <SurfaceBlock label="확인된 내용" testId="ceo-surface-confirmed">
        {surfaces.confirmedFacts.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4">
            {surfaces.confirmedFacts.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          '—'
        )}
      </SurfaceBlock>
      <SurfaceBlock label="아직 확인되지 않은 내용" testId="ceo-surface-unconfirmed">
        {surfaces.unconfirmedItems.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4">
            {surfaces.unconfirmedItems.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : surfaces.confirmedFacts.length > 0 ? (
          <p className="text-muted-foreground">
            현재 미확인으로 분류된 항목이 없습니다. 다음 질문으로 이어갑니다.
          </p>
        ) : (
          <p className="text-muted-foreground">
            아직 미확인 목록이 없습니다. 답변을 입력하면 AI가 확인·미확인 항목을
            갱신합니다.
          </p>
        )}
      </SurfaceBlock>
      <SurfaceBlock label="왜 이것을 묻는지" testId="ceo-surface-why-ask">
        {whyLines.length > 0 ? (
          <div className="space-y-1">
            {whyLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : (
          '—'
        )}
      </SurfaceBlock>
      <SurfaceBlock label="다음 질문" testId="ceo-surface-next-question">
        {surfaces.nextQuestion ?? '—'}
      </SurfaceBlock>
    </div>
  );
}
