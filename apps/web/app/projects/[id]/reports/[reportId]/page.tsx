export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getGenerationStatus } from '@/features/ai-report';
import { getReportDetail, ReportDetail } from '@/features/reports';

type ReportDetailPageProps = {
  params: Promise<{ id: string; reportId: string }>;
};

export async function generateMetadata({
  params,
}: ReportDetailPageProps): Promise<Metadata> {
  const { id, reportId } = await params;
  const project = await getProject(id);
  const report = await getReportDetail(id, reportId);

  return {
    title: report
      ? `${report.title} | AI Startup Validation Framework`
      : project
        ? `Report | ${project.title} | AI Startup Validation Framework`
        : 'Report | AI Startup Validation Framework',
  };
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { id, reportId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const report = await getReportDetail(id, reportId);

  if (!report) {
    notFound();
  }

  const latestGeneration = await getGenerationStatus(reportId);

  return (
    <ReportDetail
      project={project}
      report={report}
      latestGeneration={latestGeneration}
    />
  );
}
