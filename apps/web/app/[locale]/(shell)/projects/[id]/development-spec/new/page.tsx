export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getProject } from '@/features/projects/actions/project-actions';
import { getPRDList } from '@/features/prd';
import { DevelopmentSpecForm } from '@/features/development-spec';
import { Button, PageHeader } from '@repo/ui';

type NewDevelopmentSpecPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewDevelopmentSpecPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('pages.newDevSpec')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('pages.newDevSpec')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function NewDevelopmentSpecPage({
  params,
}: NewDevelopmentSpecPageProps) {
  const t = await getTranslations('pages');
  const tNav = await getTranslations('common.navLinks');
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const prds = await getPRDList(id);
  if (prds.length === 0) {
    redirect(`/projects/${id}/prd`);
  }

  return (
    <>
      <PageHeader
        title={t('newDevSpec')}
        description={`New engineering spec for ${project.title}`}
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/development-spec`}>{tNav('backToList')}</Link>
        </Button>
      </div>
      <div className="mt-8">
        <DevelopmentSpecForm projectId={project.id} prds={prds} />
      </div>
    </>
  );
}
