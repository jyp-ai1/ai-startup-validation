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

function FitScoreProgress({
  score,
  noFitScores,
  averageFit,
}: {
  score: number | null;
  noFitScores: string;
  averageFit: string;
}) {
  if (score === null) {
    return <p className="text-sm text-muted-foreground">{noFitScores}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <span className="text-3xl font-semibold">{score}%</span>
        <span className="pb-1 text-sm text-muted-foreground">{averageFit}</span>
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
  const t = await getTranslations('grants');
  const tPages = await getTranslations('pages');
  const tNav = await getTranslations('common.navLinks');
  const basePath = `/projects/${project.id}/grants`;

  if (dashboard.totalCount === 0) {
    return (
      <>
        <PageHeader title={tPages('grantDashboard')} description={project.title} />
        <div className="mt-4">
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href={basePath}>{tNav('backToGrants')}</Link>
          </Button>
        </div>
        <div className="mt-8">
          <EmptyState
            title={t('dashboardEmptyTitle')}
            description={t('dashboardEmptyDesc')}
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>{t('addGrant')}</Link>
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
        title={tPages('grantDashboard')}
        description={t('dashboardProgramCount', {
          count: dashboard.totalCount,
          project: project.title,
        })}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={basePath}>{tNav('backToGrants')}</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>{tNav('backToProject')}</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('totalPrograms')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{dashboard.totalCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('registeredPrograms')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('averageFitScore')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FitScoreProgress
              score={dashboard.averageFitScore}
              noFitScores={t('noFitScores')}
              averageFit={t('averageFit')}
            />
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
