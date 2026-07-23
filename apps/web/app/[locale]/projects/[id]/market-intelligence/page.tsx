export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FeatureEmptyPage } from '@/components/feature-empty-page';
import { getProject } from '@/features/projects/actions/project-actions';

type MarketIntelligencePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: MarketIntelligencePageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('nav.marketIntelligence')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('nav.marketIntelligence')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function MarketIntelligencePage({ params }: MarketIntelligencePageProps) {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <FeatureEmptyPage
      title={t('strategy.marketIntelligence.title')}
      description={t('strategy.marketIntelligence.description', { project: project.title })}
      emptyTitle={t('strategy.marketIntelligence.emptyTitle')}
      emptyDescription={t('strategy.marketIntelligence.emptyDescription')}
    />
  );
}
