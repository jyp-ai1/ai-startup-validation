'use client';

import type { WorkspaceBusinessState } from '../../lib/business-understanding/build-ai-pm-business-clarity';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceBusinessStateHeaderProps = {
  state: WorkspaceBusinessState;
  className?: string;
};

/** S4 narrative header — structured snapshot deferred to S6.2. */
export function WorkspaceBusinessStateHeader({
  state,
  className,
}: WorkspaceBusinessStateHeaderProps) {
  return (
    <section
      className={cn(
        'shrink-0 border-b border-primary/20 bg-gradient-to-r from-primary/[0.06] via-background to-background px-4 py-4 sm:px-6 lg:px-8',
        className,
      )}
      aria-label={state.label}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{state.label}</p>
      <div className="mt-2 space-y-1">
        {state.headlineLines.map((line) => (
          <p key={line} className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
