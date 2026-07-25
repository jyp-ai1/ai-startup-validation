import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { buildPageMetadata } from '@/lib/site/page-metadata';

const GoalSelectionView = dynamic(
  () =>
    import('@/features/workflow-journey/components/goal-selection-view').then(
      (m) => m.GoalSelectionView,
    ),
  { loading: () => <JourneyPageSkeleton phase="goal" /> },
);

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    descriptionKey: 'subtitle',
    namespace: 'workflow.goal',
  });
}

type GoalPageProps = {
  searchParams: Promise<{ demo?: string }>;
};

export default async function GoalPage({ searchParams }: GoalPageProps) {
  const params = await searchParams;
  return <GoalSelectionView demoMode={params.demo === '1'} />;
}
