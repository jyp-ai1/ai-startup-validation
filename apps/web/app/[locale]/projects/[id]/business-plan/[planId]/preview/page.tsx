export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getBusinessPlan, BusinessPlanPreview } from '@/features/business-plan';

type BusinessPlanPreviewPageProps = {
  params: Promise<{ id: string; planId: string }>;
};

export async function generateMetadata({
  params,
}: BusinessPlanPreviewPageProps): Promise<Metadata> {
  const { id, planId } = await params;
  const plan = await getBusinessPlan(id, planId);

  return {
    title: plan
      ? `Preview: ${plan.title} | AI Startup Validation Framework`
      : 'Business Plan Preview | AI Startup Validation Framework',
  };
}

export default async function BusinessPlanPreviewPage({
  params,
}: BusinessPlanPreviewPageProps) {
  const { id, planId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const plan = await getBusinessPlan(id, planId);

  if (!plan) {
    notFound();
  }

  return <BusinessPlanPreview project={project} plan={plan} />;
}
