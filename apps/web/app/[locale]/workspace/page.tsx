import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import {
  getWorkflowTemplate,
  readJourneyGoal,
  StrategyWorkspaceShell,
} from '@/features/workflow-journey';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workflow.workspace');
  const tm = await getTranslations('meta');
  return {
    title: `${t('title')} | ${tm('titleSuffix')}`,
    robots: { index: false, follow: false },
  };
}

type WorkspacePageProps = {
  searchParams: Promise<{ demo?: string }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const params = await searchParams;
  const goalId = await readJourneyGoal();
  if (!goalId) {
    redirect('/goal');
  }

  const template = getWorkflowTemplate(goalId);
  return (
    <StrategyWorkspaceShell
      goalId={goalId}
      template={template}
      demoMode={params.demo === '1'}
    />
  );
}
