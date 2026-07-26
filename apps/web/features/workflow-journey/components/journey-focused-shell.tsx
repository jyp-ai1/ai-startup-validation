'use client';

import { cn } from '@repo/ui/lib/utils';

import {
  DecisionBoardPlaceholder,
  FounderWorkspaceLayout,
} from './founder-workspace-layout';
import type { WorkspaceJourneyStepId } from './workspace-journey-guide';

/** Matches `JourneyLayout` wide main column — one width token for all journey phases. */
export const JOURNEY_WIDE_MAIN =
  'mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 2xl:max-w-7xl';

type JourneyFocusedShellProps = {
  children: React.ReactNode;
  activeStep?: WorkspaceJourneyStepId;
  right?: React.ReactNode;
  className?: string;
  embedded?: boolean;
  ariaLabel?: string;
};

export function JourneyFocusedShell({
  children,
  activeStep = 'execution',
  right,
  className,
  embedded = false,
  ariaLabel,
}: JourneyFocusedShellProps) {
  const body = (
    <FounderWorkspaceLayout
      embedded
      activeStep={activeStep}
      center={children}
      right={right ?? <DecisionBoardPlaceholder />}
      className={className}
    />
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
