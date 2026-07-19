export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getReportList, ReportList } from '@/features/reports';

type ReportListPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ReportListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Reports | ${project.title} | AI Startup Validation Framework`
      : 'Reports | AI Startup Validation Framework',
  };
}

export default async function ProjectReportsPage({ params }: ReportListPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const reports = await getReportList(id);

  return <ReportList project={project} reports={reports} />;
}
