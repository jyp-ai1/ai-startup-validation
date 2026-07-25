'use client';

import { Skeleton } from '@repo/ui';

type JourneyPageSkeletonProps = {
  phase?: 'goal' | 'workflow' | 'workspace';
};

export function JourneyPageSkeleton({ phase = 'goal' }: JourneyPageSkeletonProps) {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading">
      <div className="border-b border-border/60">
        <Skeleton className="mx-auto h-14 max-w-3xl" />
        <Skeleton className="mx-auto mb-3 h-1 max-w-3xl" />
      </div>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6 sm:py-12">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        {phase === 'goal' ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : null}
        {phase === 'workflow' ? (
          <div className="mt-6 space-y-4" aria-hidden>
            <Skeleton className="h-36 w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
