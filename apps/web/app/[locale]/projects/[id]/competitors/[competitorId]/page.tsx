export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getCompetitor, CompetitorDetail } from '@/features/competitors';

type CompetitorDetailPageProps = {
  params: Promise<{ id: string; competitorId: string }>;
};

export async function generateMetadata({
  params,
}: CompetitorDetailPageProps): Promise<Metadata> {
  const { id, competitorId } = await params;
  const competitor = await getCompetitor(id, competitorId);

  return {
    title: competitor
      ? `${competitor.name} | LaunchLens`
      : 'Competitor | LaunchLens',
  };
}

export default async function CompetitorDetailPage({
  params,
}: CompetitorDetailPageProps) {
  const { id, competitorId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const competitor = await getCompetitor(id, competitorId);

  if (!competitor) {
    notFound();
  }

  return <CompetitorDetail project={project} competitor={competitor} />;
}
