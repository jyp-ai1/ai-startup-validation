export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getVOCDetail, VOCDetail } from '@/features/voc';

type VOCDetailPageProps = {
  params: Promise<{ id: string; vocId: string }>;
};

export async function generateMetadata({
  params,
}: VOCDetailPageProps): Promise<Metadata> {
  const { id, vocId } = await params;
  const entry = await getVOCDetail(id, vocId);

  return {
    title: entry
      ? `${entry.title} | AI Startup Validation Framework`
      : 'VOC | AI Startup Validation Framework',
  };
}

export default async function VOCDetailPage({ params }: VOCDetailPageProps) {
  const { id, vocId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const entry = await getVOCDetail(id, vocId);

  if (!entry) {
    notFound();
  }

  return <VOCDetail project={project} entry={entry} />;
}
