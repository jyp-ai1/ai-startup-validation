import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { GoalSelectionView } from '@/features/workflow-journey';

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
