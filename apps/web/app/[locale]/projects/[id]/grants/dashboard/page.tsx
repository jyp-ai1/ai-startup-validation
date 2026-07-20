export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getGrantDashboard, GrantDashboardView } from '@/features/grants';

type GrantDashboardPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: GrantDashboardPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Grant Dashboard | ${project.title} | LaunchLens`
      : 'Grant Dashboard | LaunchLens',
  };
}

export default async function GrantDashboardPage({
  params,
}: GrantDashboardPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const dashboard = await getGrantDashboard(id);

  return <GrantDashboardView project={project} dashboard={dashboard} />;
}
