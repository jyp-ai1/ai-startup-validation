'use client';

import type { AiPmBusinessClarity } from '../../lib/business-understanding/build-ai-pm-business-clarity';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceAiPmBusinessClarityBlockProps = {
  clarity: AiPmBusinessClarity;
  className?: string;
};

export function WorkspaceAiPmBusinessClarityBlock({
  clarity,
  className,
}: WorkspaceAiPmBusinessClarityBlockProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-sky-500/25 bg-sky-500/[0.06] px-5 py-4 sm:px-6',
        className,
      )}
    >
      <p className="text-[15px] font-semibold leading-relaxed">{clarity.lead}</p>
      <div className="mt-3 space-y-3">
        <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            처음
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{clarity.initialSummary}</p>
        </div>
        <div className="flex justify-center text-muted-foreground" aria-hidden>
          ↓
        </div>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.05] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-800 dark:text-sky-300">
            지금
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
            {clarity.currentSummary}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[15px] font-medium leading-relaxed">{clarity.evolutionLead}</p>
    </section>
  );
}
