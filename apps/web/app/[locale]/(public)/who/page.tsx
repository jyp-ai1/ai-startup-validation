import { Suspense } from 'react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { WhoJourneyTracker } from '@/features/workspace/components/journey-page-tracker';
import { WorkspaceAuthCompleteTracker } from '@/features/workspace/components/workspace-auth-complete-tracker';
import { getServerAuthUser } from '@/lib/auth/server-auth';
import { buildPageMetadata } from '@/lib/site/page-metadata';

const PersonaSelectionView = dynamic(
  () =>
    import('@/features/workflow-journey/components/v2/persona-selection-view').then(
      (m) => m.PersonaSelectionView,
    ),
  { loading: () => <JourneyPageSkeleton phase="goal" /> },
);

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    descriptionKey: 'lead',
    namespace: 'workflow.v2.persona',
    path: '/who',
  });
}

type WhoPageProps = {
  searchParams: Promise<{
    demo?: string;
    auth?: string;
    project?: string;
    welcome?: string;
    promoted?: string;
  }>;
};

export default async function WhoPage({ searchParams }: WhoPageProps) {
  const params = await searchParams;
  const user = await getServerAuthUser();
  const authComplete = params.auth === 'complete';

  return (
    <>
      <Suspense fallback={null}>
        <WhoJourneyTracker projectId={params.project} />
      </Suspense>
      {authComplete ? (
        <Suspense fallback={null}>
          <WorkspaceAuthCompleteTracker
            screen="/who"
            projectId={params.project}
            promoted={params.promoted === '1'}
          />
        </Suspense>
      ) : null}
      <PersonaSelectionView demoMode={params.demo === '1'} user={user} />
    </>
  );
}
