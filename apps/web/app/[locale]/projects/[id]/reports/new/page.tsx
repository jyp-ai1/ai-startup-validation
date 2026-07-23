export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getProject } from '@/features/projects/actions/project-actions';
import { Button, PageHeader } from '@repo/ui';
import { ReportForm } from '@/features/reports';

type NewReportPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewReportPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('pages.newReport')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('pages.newReport')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function NewReportPage({ params }: NewReportPageProps) {
  const t = await getTranslations('pages');
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={t('newReport')}
        description={`New report for ${project.title}`}
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/reports`}>Back to reports</Link>
        </Button>
      </div>
      <div className="mt-8">
        <ReportForm projectId={project.id} />
      </div>
    </>
  );
}
