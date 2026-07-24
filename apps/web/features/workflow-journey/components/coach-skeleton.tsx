'use client';

import { Skeleton } from '@repo/ui';

export function CoachSkeleton() {
  return (
    <aside className="rounded-2xl border border-border/60 p-5" aria-busy="true" aria-label="Loading coach">
      <div className="flex items-center gap-2 border-b border-border/60 pb-4">
        <Skeleton className="size-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </aside>
  );
}
