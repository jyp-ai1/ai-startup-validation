import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { readJourneyPersona } from '@/features/workflow-journey/lib/v2-journey-cookies';
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
  searchParams: Promise<{ demo?: string }>;
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

  if (!isPublicDemo) {
    const persona = await readJourneyPersona();
    if (!persona) {
      redirect('/who');
    }
  }

  return <V2StrategyWorkspaceView mode={demoMode === 'default' ? 'default' : demoMode} />;
}
