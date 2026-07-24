'use client';

import { cn } from '@repo/ui/lib/utils';

type JourneyFadeProps = {
  children: React.ReactNode;
  className?: string;
};

/** Route/content fade-in ~220ms (Epic 1.6+). */
export function JourneyFade({ children, className }: JourneyFadeProps) {
  return <div className={cn('journey-fade-in', className)}>{children}</div>;
}
