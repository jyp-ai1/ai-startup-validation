export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getProject } from '@/features/projects/actions/project-actions';
import { PRDForm } from '@/features/prd';
import { Button, PageHeader } from '@repo/ui';

type NewPRDPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: NewPRDPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('pages.newPrd')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('pages.newPrd')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function NewPRDPage({ params }: NewPRDPageProps) {
  const t = await getTranslations('pages');
  const tNav = await getTranslations('common.navLinks');
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={t('newPrd')}
        description={t('newPrdDesc', { project: project.title })}
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/prd`}>{tNav('backToList')}</Link>
        </Button>
      </div>
      <div className="mt-8">
        <PRDForm projectId={project.id} />
      </div>
    </>
  );
}
