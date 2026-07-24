import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getTranslations } from 'next-intl/server';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';

const GoalSelectionView = dynamic(
  () =>
    import('@/features/workflow-journey/components/goal-selection-view').then(
      (m) => m.GoalSelectionView,
    ),
  { loading: () => <JourneyPageSkeleton phase="goal" /> },
);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workflow.goal');
  const tm = await getTranslations('meta');
  return {
    title: `${t('title')} | ${tm('titleSuffix')}`,
    robots: { index: false, follow: false },
  };
}

type GoalPageProps = {
  searchParams: Promise<{ demo?: string }>;
};

export default async function GoalPage({ searchParams }: GoalPageProps) {
  const params = await searchParams;
  return <GoalSelectionView demoMode={params.demo === '1'} />;
}
