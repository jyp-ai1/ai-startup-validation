import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { readJourneyGoal } from '@/features/workflow-journey';
import { readJourneyPersona } from '@/features/workflow-journey/lib/v2-journey-cookies';
import { buildPageMetadata } from '@/lib/site/page-metadata';

const V2WorkspaceDetailView = dynamic(
  () =>
    import('@/features/workflow-journey/components/v2/v2-workspace-detail-view').then(
      (m) => m.V2WorkspaceDetailView,
    ),
  { loading: () => <JourneyPageSkeleton phase="workspace" /> },
);

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
  const persona = await readJourneyPersona();
  if (!goalId) {
    redirect('/who');
  }

  if (persona) {
    return <V2WorkspaceDetailView goalId={goalId} />;
  }

  const { getWorkflowTemplate } = await import('@/features/workflow-journey');
  const template = getWorkflowTemplate(goalId);
  return (
    <StrategyWorkspaceShell
      goalId={goalId}
      template={template}
      demoMode={params.demo === '1'}
    />
  );
}
