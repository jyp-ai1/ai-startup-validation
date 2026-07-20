export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getCompetitors, CompetitorList } from '@/features/competitors';

type CompetitorListPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CompetitorListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Competitors | ${project.title} | LaunchLens`
      : 'Competitors | LaunchLens',
  };
}

export default async function CompetitorListPage({
  params,
}: CompetitorListPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const competitors = await getCompetitors(id);

  return <CompetitorList project={project} competitors={competitors} />;
}
