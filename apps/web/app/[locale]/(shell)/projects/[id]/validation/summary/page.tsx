export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getProject } from '@/features/projects/actions/project-actions';
import { getValidationScore, ValidationSummary } from '@/features/validation';

type ValidationSummaryPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ValidationSummaryPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('pages.validationSummary')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('pages.validationSummary')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function ValidationSummaryPage({
  params,
}: ValidationSummaryPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const score = await getValidationScore(id);

  return <ValidationSummary project={project} score={score} />;
}
