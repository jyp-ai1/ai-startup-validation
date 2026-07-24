'use client';

import { Skeleton } from '@repo/ui';

export function WorkspaceSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 sm:w-32" />
          <Skeleton className="h-7 w-40 sm:w-56 lg:h-8 lg:w-64" />
        </div>
        <Skeleton className="h-10 w-14 sm:w-16" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="grid gap-6 xl:grid-cols-[1fr_minmax(280px,360px)]">
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl sm:h-48" />
          <Skeleton className="h-28 w-full rounded-2xl sm:h-32" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-72 w-full rounded-2xl sm:h-80" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl sm:max-w-md" />
    </div>
  );
}
