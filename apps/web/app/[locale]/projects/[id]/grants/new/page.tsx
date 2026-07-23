export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Button, PageHeader } from '@repo/ui';

import { getProject } from '@/features/projects/actions/project-actions';
import { GrantForm } from '@/features/grants';

type NewGrantPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewGrantPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('pages.newGrant')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('pages.newGrant')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function NewGrantPage({ params }: NewGrantPageProps) {
  const t = await getTranslations('pages');
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader title={t('newGrant')} description={project.title} />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/grants`}>Back to grants</Link>
        </Button>
      </div>
      <div className="mt-8">
        <GrantForm mode="create" projectId={id} />
      </div>
    </>
  );
}
