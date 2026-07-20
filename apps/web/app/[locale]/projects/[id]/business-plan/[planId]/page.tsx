export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getBusinessPlan, BusinessPlanDetail } from '@/features/business-plan';

type BusinessPlanDetailPageProps = {
  params: Promise<{ id: string; planId: string }>;
};

export async function generateMetadata({
  params,
}: BusinessPlanDetailPageProps): Promise<Metadata> {
  const { id, planId } = await params;
  const project = await getProject(id);
  const plan = await getBusinessPlan(id, planId);

  return {
    title: plan
      ? `${plan.title} | LaunchLens`
      : project
        ? `Business Plan | ${project.title} | LaunchLens`
        : 'Business Plan | LaunchLens',
  };
}

export default async function BusinessPlanDetailPage({
  params,
}: BusinessPlanDetailPageProps) {
  const { id, planId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const plan = await getBusinessPlan(id, planId);

  if (!plan) {
    notFound();
  }

  return <BusinessPlanDetail project={project} plan={plan} />;
}
