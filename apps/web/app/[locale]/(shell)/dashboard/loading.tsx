import { Skeleton } from '@repo/ui';

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-8 xl:grid-cols-[1fr_minmax(320px,380px)]">
        <div className="space-y-8">
          <Skeleton className="h-44 rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
