import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { GrantDashboard, StartupProject } from '@repo/types/validation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from '@repo/ui';

import {
  GrantDashboardCharts,
  GrantDeadlineCalendar,
} from './grant-dashboard-panels';

type GrantDashboardViewProps = {
  project: StartupProject;
  dashboard: GrantDashboard;
};

function FitScoreProgress({ score }: { score: number | null }) {
  if (score === null) {
    return <p className="text-sm text-muted-foreground">No fit scores recorded</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <span className="text-3xl font-semibold">{score}%</span>
        <span className="pb-1 text-sm text-muted-foreground">average fit</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export async function GrantDashboardView({ project, dashboard }: GrantDashboardViewProps) {
  const t = await getTranslations('pages');
  const basePath = `/projects/${project.id}/grants`;

  if (dashboard.totalCount === 0) {
    return (
      <>
        <PageHeader title={t('grantDashboard')} description={project.title} />
        <div className="mt-4">
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href={basePath}>Back to grants</Link>
          </Button>
        </div>
        <div className="mt-8">
          <EmptyState
            title="No grants to analyze"
            description="Add government support programs to see dashboard insights."
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Add Grant</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('grantDashboard')}
        description={`${dashboard.totalCount} programs · ${project.title}`}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={basePath}>Back to grants</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{dashboard.totalCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Registered support programs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Fit Score</CardTitle>
          </CardHeader>
          <CardContent>
            <FitScoreProgress score={dashboard.averageFitScore} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GrantDashboardCharts
          supportTypeDistribution={dashboard.supportTypeDistribution}
        />
        <GrantDeadlineCalendar
          projectId={project.id}
          deadlines={dashboard.deadlines}
        />
      </div>
    </>
  );
}
