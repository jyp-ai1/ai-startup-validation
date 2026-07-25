import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { getWorkflowTemplate, readJourneyGoal } from '@/features/workflow-journey';
import { buildPageMetadata } from '@/lib/site/page-metadata';

const StrategyWorkspaceShell = dynamic(
  () =>
    import('@/features/workflow-journey/components/strategy-workspace-shell').then(
      (m) => m.StrategyWorkspaceShell,
    ),
  { loading: () => <JourneyPageSkeleton phase="workspace" /> },
);

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    namespace: 'workflow.workspace',
    path: '/workspace',
  });
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
