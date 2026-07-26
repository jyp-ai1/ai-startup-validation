'use client';

import { cn } from '@repo/ui/lib/utils';

import { JOURNEY_WIDE_MAIN } from './journey-focused-shell';

type WorkspaceShellProps = {
  /** Permanent left — AI PM workflow (~30%) */
  left: React.ReactNode;
  /** Center — current work (~40%) */
  center: React.ReactNode;
  /** Right — Executive Decision Board (~30%) */
  right?: React.ReactNode;
  className?: string;
  stackAt?: 'md' | 'lg';
  embedded?: boolean;
};

/**
 * Unified AI PM Office — 30/40/30 across every journey phase.
 * Left workflow never disappears; center = work; right = decision board.
 */
export function WorkspaceShell({
  left,
  center,
  right,
  className,
  stackAt = 'lg',
  embedded = false,
}: WorkspaceShellProps) {
  const gridClass =
    stackAt === 'md'
      ? right
        ? 'md:grid-cols-[3fr_4fr_3fr]'
        : 'md:grid-cols-[3fr_7fr]'
      : right
        ? 'lg:grid-cols-[3fr_4fr_3fr]'
        : 'lg:grid-cols-[3fr_7fr]';

  const stickyClass =
    stackAt === 'md'
      ? 'md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto'
      : 'lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto';

  const content = (
    <div className={cn('grid min-w-0 gap-5', gridClass, 'items-start', className)}>
      <aside className={cn('min-w-0 space-y-4', stickyClass)}>{left}</aside>
      <div className="min-w-0 space-y-5">{center}</div>
      {right ? (
        <aside className={cn('min-w-0 space-y-4', stickyClass)}>{right}</aside>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className={JOURNEY_WIDE_MAIN}>{content}</div>;
}
