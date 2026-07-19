export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getReportDetail, ReportPreview } from '@/features/reports';

type ReportPreviewPageProps = {
  params: Promise<{ id: string; reportId: string }>;
};

export async function generateMetadata({
  params,
}: ReportPreviewPageProps): Promise<Metadata> {
  const { id, reportId } = await params;
  const project = await getProject(id);
  const report = await getReportDetail(id, reportId);

  return {
    title: report
      ? `Preview: ${report.title} | AI Startup Validation Framework`
      : project
        ? `Report Preview | ${project.title} | AI Startup Validation Framework`
        : 'Report Preview | AI Startup Validation Framework',
  };
}

export default async function ReportPreviewPage({ params }: ReportPreviewPageProps) {
  const { id, reportId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const report = await getReportDetail(id, reportId);

  if (!report) {
    notFound();
  }

  return <ReportPreview project={project} report={report} />;
}
