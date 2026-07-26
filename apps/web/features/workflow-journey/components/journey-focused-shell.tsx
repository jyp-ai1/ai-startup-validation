'use client';

import { cn } from '@repo/ui/lib/utils';

import { WorkspaceShell } from './workspace-shell';

/** Matches `JourneyLayout` wide main column — one width token for all journey phases. */
export const JOURNEY_WIDE_MAIN =
  'mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 2xl:max-w-7xl';

type JourneyFocusedShellProps = {
  children: React.ReactNode;
  /** Optional left rail for unified 35/65 executive layout */
  rail?: React.ReactNode;
  className?: string;
  embedded?: boolean;
  ariaLabel?: string;
};

export function JourneyFocusedShell({
  children,
  rail,
  className,
  embedded = false,
  ariaLabel,
}: JourneyFocusedShellProps) {
  const body =
    rail != null ? (
      <WorkspaceShell embedded rail={rail} main={children} className={className} />
    ) : (
      <div className={cn('space-y-6', className)}>{children}</div>
    );

  if (embedded) {
    return body;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className={cn(JOURNEY_WIDE_MAIN, 'min-h-full py-8 sm:py-12')}>{body}</div>
    </div>
  );
}
