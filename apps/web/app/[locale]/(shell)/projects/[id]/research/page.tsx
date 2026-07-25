export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getProjectResearchJobs } from '@/features/agents/research';
import { getResearchPlans, ResearchList } from '@/features/research';
import { resolveResearchProviderId } from '@/lib/ai/config';

type ResearchListPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ResearchListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Research | ${project.title} | LaunchLens`
      : 'Research | LaunchLens',
  };
}

export default async function ResearchListPage({ params }: ResearchListPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const [plans, agentJobs] = await Promise.all([
    getResearchPlans(id),
    getProjectResearchJobs(id),
  ]);
  const researchProviderId = resolveResearchProviderId();

  return (
    <ResearchList
      project={project}
      plans={plans}
      agentJobs={agentJobs}
      researchProviderId={researchProviderId}
    />
  );
}
