export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getVOCList, VOCList } from '@/features/voc';
import { parseVOCFilters } from '@/features/voc/schemas/voc-schema';

type VOCListPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    sourceType?: string;
    customerSegment?: string;
    severity?: string;
    frequency?: string;
  }>;
};

export async function generateMetadata({
  params,
}: VOCListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `VOC | ${project.title} | LaunchLens`
      : 'VOC | LaunchLens',
  };
}

export default async function VOCListPage({
  params,
  searchParams,
}: VOCListPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const filters = parseVOCFilters(query);
  const entries = await getVOCList(id, filters);

  return <VOCList project={project} entries={entries} filters={query} />;
}
