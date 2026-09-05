'use client';

import type { ReactNode } from 'react';

import { cn } from '@repo/ui/lib/utils';

import type { AiPmFocusedSnapshot } from '../../lib/business-understanding/ai-pm-focused-presenter';

function FocusedBlock({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section data-testid={testId} aria-label={label} className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export type WorkspaceAiPmFocusedSurfaceProps = {
  snapshot: AiPmFocusedSnapshot;
  className?: string;
};

/**
 * DAY 8-B — Focused 3-block CEO UI (presentation layer only).
 * Internal 6 Surfaces remain in engine; this replaces CEO-facing accumulation.
 */
export function WorkspaceAiPmFocusedSurface({
  snapshot,
  className,
}: WorkspaceAiPmFocusedSurfaceProps) {
  return (
    <div
      data-testid="ai-pm-focused-surface"
      className={cn('space-y-4', className)}
    >
      <FocusedBlock label="AI가 이해한 현재 사업" testId="focused-business-understanding">
        {snapshot.businessUnderstanding}
      </FocusedBlock>
      <FocusedBlock label="현재 판단" testId="focused-current-judgment">
        {snapshot.currentJudgment}
      </FocusedBlock>
      <FocusedBlock label="지금 확인할 것" testId="focused-confirm-prompt">
        <p className="mb-2 text-muted-foreground">{snapshot.confirmPrompt}</p>
        <p className="font-medium text-foreground">{snapshot.questionText}</p>
      </FocusedBlock>
    </div>
  );
}
