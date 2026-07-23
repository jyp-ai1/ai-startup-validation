export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FeatureEmptyPage } from '@/components/feature-empty-page';
import { getProject } from '@/features/projects/actions/project-actions';

type BusinessStrategyPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: BusinessStrategyPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('nav.businessStrategy')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('nav.businessStrategy')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function BusinessStrategyPage({ params }: BusinessStrategyPageProps) {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <FeatureEmptyPage
      title={t('strategy.business.title')}
      description={t('strategy.business.description', { project: project.title })}
      emptyTitle={t('strategy.business.emptyTitle')}
      emptyDescription={t('strategy.business.emptyDescription')}
    />
  );
}
