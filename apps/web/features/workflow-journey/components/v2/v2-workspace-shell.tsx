'use client';

import { cn } from '@repo/ui/lib/utils';

import { JOURNEY_WIDE_MAIN } from '../journey-focused-shell';

type V2WorkspaceShellProps = {
  /** AI PM Office — chat */
  aiPm: React.ReactNode;
  /** Executive Decision — conclusion-first */
  decision: React.ReactNode;
  className?: string;
  stackAt?: 'md' | 'lg';
  embedded?: boolean;
};

/**
 * V2 Workspace — 2 columns only (AI PM | Decision).
 * No left workflow rail. Mobile stacks vertically.
 */
export function V2WorkspaceShell({
  aiPm,
  decision,
  className,
  stackAt = 'lg',
  embedded = false,
}: V2WorkspaceShellProps) {
  const gridClass =
    stackAt === 'md' ? 'md:grid-cols-[1fr_1fr]' : 'lg:grid-cols-[11fr_9fr]';

  const stickyClass =
    stackAt === 'md'
      ? 'md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto'
      : 'lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto';

  const content = (
    <div className={cn('grid min-w-0 gap-5', gridClass, 'items-start', className)}>
      <div className="min-w-0 space-y-5">{aiPm}</div>
      <aside className={cn('min-w-0 space-y-4', stickyClass)}>{decision}</aside>
    </div>
  );

  if (embedded) return content;
  return <div className={JOURNEY_WIDE_MAIN}>{content}</div>;
}
