export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getEvidenceList, EvidenceList } from '@/features/evidence';
import { parseEvidenceFilters } from '@/features/evidence/schemas/evidence-schema';

type EvidenceListPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    category?: string;
    sourceType?: string;
    confidence?: string;
  }>;
};

export async function generateMetadata({
  params,
}: EvidenceListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Evidence | ${project.title} | AI Startup Validation Framework`
      : 'Evidence | AI Startup Validation Framework',
  };
}

export default async function EvidenceListPage({
  params,
  searchParams,
}: EvidenceListPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const filters = parseEvidenceFilters(query);
  const evidenceList = await getEvidenceList(id, filters);

  return (
    <EvidenceList
      project={project}
      evidenceList={evidenceList}
      filters={query}
    />
  );
}
