export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { compareCompetitors, CompetitorCompare } from '@/features/competitors';

type CompetitorComparePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: CompetitorComparePageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Compare Competitors | ${project.title} | LaunchLens`
      : 'Compare Competitors | LaunchLens',
  };
}

export default async function CompetitorComparePage({
  params,
}: CompetitorComparePageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const comparison = await compareCompetitors(id);

  return <CompetitorCompare project={project} comparison={comparison} />;
}
