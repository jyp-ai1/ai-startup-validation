export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getProject } from '@/features/projects/actions/project-actions';
import { Button, PageHeader } from '@repo/ui';
import { ValidationScoreForm } from '@/features/validation';

type NewValidationPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewValidationPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('pages.newValidation')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('pages.newValidation')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function NewValidationPage({ params }: NewValidationPageProps) {
  const t = await getTranslations('pages');
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={t('newValidation')}
        description={`Evaluate ${project.title} across six dimensions`}
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/validation`}>Back to dashboard</Link>
        </Button>
      </div>
      <div className="mt-8">
        <ValidationScoreForm mode="create" projectId={project.id} />
      </div>
    </>
  );
}
