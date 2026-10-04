'use client';

import { cn } from '@repo/ui/lib/utils';

import type { UxBusinessSummaryView } from '../../lib/ux-flow-recovery/build-ux-business-summary';
import { WorkspaceExpandableText } from './workspace-expandable-text';

type WorkspaceCurrentUnderstandingBlockProps = {
  summary: UxBusinessSummaryView;
  className?: string;
};

export function WorkspaceCurrentUnderstandingBlock({
  summary,
  className,
}: WorkspaceCurrentUnderstandingBlockProps) {
  return (
    <section
      data-testid="current-understanding-block"
      className={cn(
        'rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-4 sm:px-6',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">AI PM</p>
      <h2 className="mt-2 text-[15px] font-semibold leading-snug">현재까지 이렇게 이해했습니다</h2>
      <p
        data-testid="current-understanding-narrative"
        className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
      >
        {summary.understoodNarrative}
      </p>

      {summary.fullDescription ? (
        <div
          data-testid="source-document-block"
          className="mt-4 border-t border-border/50 pt-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            사업 원문
          </p>
          <WorkspaceExpandableText
            text={summary.fullDescription}
            preview=""
            toggleLabel="사업내용 보기"
            testId="source-document-text"
            className="mt-2 text-muted-foreground"
          />
        </div>
      ) : null}
    </section>
  );
}
