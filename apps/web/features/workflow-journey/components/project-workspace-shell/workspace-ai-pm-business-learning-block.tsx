'use client';

import type { BusinessLearningSummary } from '../../lib/business-understanding/build-ai-pm-business-learning';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceAiPmBusinessLearningBlockProps = {
  learning: BusinessLearningSummary;
  className?: string;
};

/** S6.1 — one line: why the business changed after this answer. */
export function WorkspaceAiPmBusinessLearningBlock({
  learning,
  className,
}: WorkspaceAiPmBusinessLearningBlockProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-sky-500/25 bg-sky-500/[0.06] px-5 py-4 sm:px-7',
        className,
      )}
    >
      <p className="text-[15px] font-medium leading-relaxed text-foreground">{learning.insight}</p>
    </section>
  );
}
