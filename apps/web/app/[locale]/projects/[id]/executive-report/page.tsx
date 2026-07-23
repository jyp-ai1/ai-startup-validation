import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import {
  ExecutiveReportPreview,
  generateExecutiveReport,
  getExecutiveReport,
} from '@/features/report-engine';
import { getProject } from '@/features/projects/actions/project-actions';

type ExecutiveReportPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ExecutiveReportPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('reportEngine.preview.pageTitle')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('reportEngine.preview.pageTitle')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function ExecutiveReportPage({ params }: ExecutiveReportPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  let report = await getExecutiveReport(id);
  if (!report) {
    const result = await generateExecutiveReport(id);
    if (result.error || !result.reportId) {
      notFound();
    }
    report = await getExecutiveReport(id);
  }

  if (!report) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <ExecutiveReportPreview report={report} projectId={id} />
    </div>
  );
}
