'use client';

import { cn } from '@repo/ui/lib/utils';

import { JOURNEY_WIDE_MAIN } from './journey-focused-shell';

type WorkspaceShellProps = {
  /** Left rail — AI PM flow, guide, approval (~35%) */
  rail: React.ReactNode;
  /** Right main — strategy dashboard, primary content (~65%) */
  main: React.ReactNode;
  className?: string;
  /** Stack vertically below this breakpoint (default lg) */
  stackAt?: 'md' | 'lg';
  embedded?: boolean;
};

/**
 * Unified AI PM Office layout — same 35/65 split across Registration, Live,
 * Completion, Today, Action, and Debrief.
 */
export function WorkspaceShell({
  rail,
  main,
  className,
  stackAt = 'lg',
  embedded = false,
}: WorkspaceShellProps) {
  const gridClass =
    stackAt === 'md'
      ? 'md:grid-cols-[7fr_13fr]'
      : 'lg:grid-cols-[7fr_13fr]';

  const content = (
    <div
      className={cn(
        'grid min-w-0 gap-6',
        gridClass,
        'items-start',
        className,
      )}
    >
      <aside
        className={cn(
          'min-w-0 space-y-4',
          stackAt === 'md' ? 'md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto' : 'lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto',
        )}
      >
        {rail}
      </aside>
      <div className="min-w-0 space-y-6">{main}</div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className={JOURNEY_WIDE_MAIN}>{content}</div>;
}
