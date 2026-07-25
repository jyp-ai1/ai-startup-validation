export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getBusinessPlanList, BusinessPlanList } from '@/features/business-plan';

type BusinessPlanListPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: BusinessPlanListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Business Plan | ${project.title} | LaunchLens`
      : 'Business Plan | LaunchLens',
  };
}

export default async function BusinessPlanListPage({ params }: BusinessPlanListPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const plans = await getBusinessPlanList(id);

  return <BusinessPlanList project={project} plans={plans} />;
}
