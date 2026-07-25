export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getVOCSummary, VOCSummaryView } from '@/features/voc';

type VOCSummaryPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: VOCSummaryPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `VOC Summary | ${project.title} | LaunchLens`
      : 'VOC Summary | LaunchLens',
  };
}

export default async function VOCSummaryPage({ params }: VOCSummaryPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const summary = await getVOCSummary(id);

  return <VOCSummaryView project={project} summary={summary} />;
}
