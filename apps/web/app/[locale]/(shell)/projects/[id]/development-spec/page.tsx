export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getPRDList } from '@/features/prd';
import { getDevelopmentSpecList, DevelopmentSpecList } from '@/features/development-spec';

type DevelopmentSpecListPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: DevelopmentSpecListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Development Spec | ${project.title} | LaunchLens`
      : 'Development Spec | LaunchLens',
  };
}

export default async function DevelopmentSpecListPage({
  params,
}: DevelopmentSpecListPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const [specs, prds] = await Promise.all([getDevelopmentSpecList(id), getPRDList(id)]);

  return (
    <DevelopmentSpecList project={project} specs={specs} hasPRD={prds.length > 0} />
  );
}
