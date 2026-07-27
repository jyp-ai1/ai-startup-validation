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

export default async function ValidationPage() {
  const persona = await readJourneyPersona();
  if (!persona) {
    redirect('/who');
  }

  return <V2StrategyWorkspaceView />;
}
