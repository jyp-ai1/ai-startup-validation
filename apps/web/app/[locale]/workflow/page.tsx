import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import {
  getWorkflowTemplate,
  readJourneyGoal,
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

export default async function WorkflowPage() {
  const goalId = await readJourneyGoal();
  if (!goalId) {
    redirect('/goal');
  }

  const template = getWorkflowTemplate(goalId);
  return <WorkflowPlanView goalId={goalId} template={template} />;
}
