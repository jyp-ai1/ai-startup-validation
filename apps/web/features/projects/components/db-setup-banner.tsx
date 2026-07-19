import { isStartupProjectsDbReady } from '@/features/projects/services/project-service';

type DbSetupBannerProps = {
  className?: string;
};

export function DbSetupBanner({ className }: DbSetupBannerProps) {
  if (isStartupProjectsDbReady()) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 ${className ?? ''}`}
    >
      Supabase is not connected. Add environment variables in Vercel and run{' '}
      <code className="rounded bg-background/80 px-1 py-0.5">
        packages/db/src/migration/002_startup_projects.sql
      </code>{' '}
      in the Supabase SQL Editor.
    </div>
  );
}
