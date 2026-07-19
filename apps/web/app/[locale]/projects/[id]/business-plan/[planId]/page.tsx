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
      ? `${plan.title} | AI Startup Validation Framework`
      : project
        ? `Business Plan | ${project.title} | AI Startup Validation Framework`
        : 'Business Plan | AI Startup Validation Framework',
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
