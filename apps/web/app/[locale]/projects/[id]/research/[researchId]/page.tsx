export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getResearchPlan, ResearchDetail } from '@/features/research';

type ResearchDetailPageProps = {
  params: Promise<{ id: string; researchId: string }>;
};

export async function generateMetadata({
  params,
}: ResearchDetailPageProps): Promise<Metadata> {
  const { id, researchId } = await params;
  const plan = await getResearchPlan(id, researchId);

  return {
    title: plan
      ? `${plan.title} | AI Startup Validation Framework`
      : 'Research Plan | AI Startup Validation Framework',
  };
}

export default async function ResearchDetailPage({
  params,
}: ResearchDetailPageProps) {
  const { id, researchId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const plan = await getResearchPlan(id, researchId);

  if (!plan) {
    notFound();
  }

  return <ResearchDetail project={project} plan={plan} />;
}
