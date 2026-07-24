'use client';

import { Skeleton } from '@repo/ui';

export function WorkspaceSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-10 w-16" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
