import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import {
  getWorkflowTemplate,
  readJourneyGoal,
  WorkflowComposeLoader,
  WorkflowPlanView,
} from '@/features/workflow-journey';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workflow.plan');
  const tm = await getTranslations('meta');
  return {
    title: `${t('title')} | ${tm('titleSuffix')}`,
    robots: { index: false, follow: false },
  };
}

type WorkflowPageProps = {
  searchParams: Promise<{ compose?: string }>;
};

export default async function WorkflowPage({ searchParams }: WorkflowPageProps) {
  const params = await searchParams;
  const goalId = await readJourneyGoal();
  if (!goalId) {
    redirect('/goal');
  }

  if (params.compose === '1') {
    return <WorkflowComposeLoader goalId={goalId} />;
  }

  const template = getWorkflowTemplate(goalId);
  return <WorkflowPlanView goalId={goalId} template={template} />;
}
