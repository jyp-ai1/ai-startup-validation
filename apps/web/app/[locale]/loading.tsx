import { Skeleton } from '@repo/ui';

export default function LandingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Skeleton className="h-16 w-full rounded-none" />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-24 text-center">
        <Skeleton className="mx-auto h-4 w-40" />
        <Skeleton className="mx-auto h-12 w-full max-w-2xl" />
        <Skeleton className="mx-auto h-6 w-96 max-w-full" />
        <div className="flex justify-center gap-3 pt-4">
          <Skeleton className="h-11 w-36 rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
