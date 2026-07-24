import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { getWorkflowTemplate, readJourneyGoal } from '@/features/workflow-journey';

const StrategyWorkspaceShell = dynamic(
  () =>
    import('@/features/workflow-journey/components/strategy-workspace-shell').then(
      (m) => m.StrategyWorkspaceShell,
    ),
  { loading: () => <JourneyPageSkeleton phase="workspace" /> },
);

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
