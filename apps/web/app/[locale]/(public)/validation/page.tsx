import { Suspense } from 'react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { readJourneyPersona } from '@/features/workflow-journey/lib/v2-journey-cookies';
import { ValidationProjectScopeTracker } from '@/features/workspace/components/validation-project-scope-tracker';
import { ValidationJourneyTracker } from '@/features/workspace/components/journey-page-tracker';
import { WorkspaceAuthCompleteTracker } from '@/features/workspace/components/workspace-auth-complete-tracker';
import { getServerAuthUser } from '@/lib/auth/server-auth';
import { buildPageMetadata } from '@/lib/site/page-metadata';

const V2StrategyWorkspaceView = dynamic(
  () =>
    import('@/features/workflow-journey/components/v2/v2-strategy-workspace').then(
      (m) => m.V2StrategyWorkspaceView,
    ),
  { loading: () => <JourneyPageSkeleton phase="workflow" /> },
);

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    descriptionKey: 'nextHint',
    namespace: 'workflow.v2.validation',
    path: '/validation',
  });
}

type ValidationPageProps = {
  searchParams: Promise<{ demo?: string; auth?: string; welcome?: string; project?: string }>;
};

function resolveDemoMode(demo: string | undefined): 'demo-readonly' | 'demo-guided' | 'default' {
  if (demo === 'readonly') return 'demo-readonly';
  if (demo === 'guided' || demo === '1') return 'demo-guided';
  return 'default';
}

export default async function ValidationPage({ searchParams }: ValidationPageProps) {
  const params = await searchParams;
  const demoMode = resolveDemoMode(params.demo);
  const isPublicDemo = demoMode === 'demo-readonly' || demoMode === 'demo-guided';
  const user = await getServerAuthUser();

  if (!isPublicDemo) {
    const persona = await readJourneyPersona();
    if (!persona) {
      redirect(params.project ? `/who?project=${encodeURIComponent(params.project)}` : '/who');
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <ValidationProjectScopeTracker />
      </Suspense>
      {!isPublicDemo ? (
        <Suspense fallback={null}>
          <ValidationJourneyTracker projectId={params.project} enabled />
        </Suspense>
      ) : null}
      {params.auth === 'complete' ? (
        <WorkspaceAuthCompleteTracker promoted={params.welcome === '1'} />
      ) : null}
      <V2StrategyWorkspaceView
        mode={demoMode === 'default' ? 'default' : demoMode}
        user={user}
      />
    </>
  );
}
