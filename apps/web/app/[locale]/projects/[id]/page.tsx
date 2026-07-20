export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { buildProjectDashboardStats } from '@/features/dashboard/services/dashboard-service';
import { ProjectDetail, ProjectWorkspaceOverview } from '@/features/projects';
import { getProject } from '@/features/projects/actions/project-actions';

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project ? `${project.title} | LaunchLens` : 'Project | LaunchLens',
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const stats = await buildProjectDashboardStats(id);

  if (stats) {
    return <ProjectWorkspaceOverview project={project} stats={stats} />;
  }

  return <ProjectDetail project={project} />;
}
