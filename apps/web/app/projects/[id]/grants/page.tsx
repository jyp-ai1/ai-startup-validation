export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getGrantList, GrantList } from '@/features/grants';
import { parseGrantFilters } from '@/features/grants/schemas/grant-schema';

type GrantListPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    category?: string;
    targetStage?: string;
    supportType?: string;
    status?: string;
  }>;
};

export async function generateMetadata({
  params,
}: GrantListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Grants | ${project.title} | AI Startup Validation Framework`
      : 'Grants | AI Startup Validation Framework',
  };
}

export default async function GrantListPage({
  params,
  searchParams,
}: GrantListPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const filters = parseGrantFilters(query);
  const grants = await getGrantList(id, filters);

  return <GrantList project={project} grants={grants} filters={query} />;
}
