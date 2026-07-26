import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { readJourneyGoal } from '@/features/workflow-journey';
import { buildPageMetadata } from '@/lib/site/page-metadata';

const V2ResearchView = dynamic(
  () =>
    import('@/features/workflow-journey/components/v2/v2-research-view').then(
      (m) => m.V2ResearchView,
    ),
  { loading: () => <JourneyPageSkeleton phase="workspace" /> },
);

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    namespace: 'workflow.v2.research',
    path: '/investigate',
  });
}

export default async function InvestigatePage() {
  const goalId = await readJourneyGoal();
  if (!goalId) {
    redirect('/who');
  }

  return <V2ResearchView goalId={goalId} />;
}
