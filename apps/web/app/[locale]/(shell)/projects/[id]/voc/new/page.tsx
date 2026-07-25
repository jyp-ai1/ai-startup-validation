export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Button, PageHeader } from '@repo/ui';

import { getProject } from '@/features/projects/actions/project-actions';
import { VOCForm } from '@/features/voc';

type NewVOCPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewVOCPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('pages.newVoc')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('pages.newVoc')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function NewVOCPage({ params }: NewVOCPageProps) {
  const t = await getTranslations('pages');
  const tNav = await getTranslations('common.navLinks');
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader title={t('newVoc')} description={project.title} />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/voc`}>{tNav('backToVocList')}</Link>
        </Button>
      </div>
      <div className="mt-8">
        <VOCForm mode="create" projectId={id} />
      </div>
    </>
  );
}
