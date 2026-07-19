export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getPRDList, PRDList } from '@/features/prd';

type PRDListPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PRDListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `PRD | ${project.title} | AI Startup Validation Framework`
      : 'PRD | AI Startup Validation Framework',
  };
}

export default async function PRDListPage({ params }: PRDListPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const prds = await getPRDList(id);

  return <PRDList project={project} prds={prds} />;
}
