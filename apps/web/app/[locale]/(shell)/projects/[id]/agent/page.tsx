export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { buildProjectDashboardStats } from '@/features/dashboard/services/dashboard-service';
import { getProject } from '@/features/projects/actions/project-actions';
import { ValidationAgentPanel } from '@/features/validation-agent';
import { WorkspaceFeatureShell } from '@/components/workspace/workspace-feature-shell';

type ValidationAgentPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ValidationAgentPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Validation Agent | ${project.title} | LaunchLens`
      : 'Validation Agent | LaunchLens',
  };
}

export default async function ValidationAgentPage({ params }: ValidationAgentPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const stats = await buildProjectDashboardStats(id);

  if (!stats) {
    notFound();
  }

  return (
    <WorkspaceFeatureShell projectId={id}>
      <ValidationAgentPanel project={project} stats={stats} />
    </WorkspaceFeatureShell>
  );
}
