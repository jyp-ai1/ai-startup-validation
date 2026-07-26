import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
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
  searchParams: Promise<{ demo?: string }>;
};

export default async function WhoPage({ searchParams }: WhoPageProps) {
  const params = await searchParams;
  return <PersonaSelectionView demoMode={params.demo === '1'} />;
}
