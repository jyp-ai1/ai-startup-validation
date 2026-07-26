import { Suspense } from 'react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { getWorkflowTemplate, readJourneyGoal } from '@/features/workflow-journey';
import { buildPageMetadata } from '@/lib/site/page-metadata';

const WorkflowComposeLoader = dynamic(
  () =>
    import('@/features/workflow-journey/components/workflow-compose-loader').then(
      (m) => m.WorkflowComposeLoader,
    ),
  { loading: () => <JourneyPageSkeleton phase="workflow" /> },
);

const WorkflowPlanView = dynamic(
  () =>
    import('@/features/workflow-journey/components/workflow-plan-view').then(
      (m) => m.WorkflowPlanView,
    ),
  { loading: () => <JourneyPageSkeleton phase="workflow" /> },
);

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    descriptionKey: 'intro',
    namespace: 'workflow.plan',
    path: '/workflow',
  });
}

type WorkflowPageProps = {
  searchParams: Promise<{ compose?: string }>;
};

function ComposeFallback() {
  return <JourneyPageSkeleton phase="workflow" />;
}

export default async function WorkflowPage({ searchParams }: WorkflowPageProps) {
  const params = await searchParams;
  const goalId = await readJourneyGoal();
  if (!goalId) {
    redirect('/who');
  }

  if (params.compose === '1') {
    return (
      <Suspense fallback={<ComposeFallback />}>
        <WorkflowComposeLoader goalId={goalId} />
      </Suspense>
    );
  }

  const template = getWorkflowTemplate(goalId);
  return <WorkflowPlanView goalId={goalId} template={template} />;
}
