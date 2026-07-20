export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getKnowledgeList, KnowledgeList } from '@/features/knowledge';

type KnowledgeListPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: KnowledgeListPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Knowledge Base | ${project.title} | LaunchLens`
      : 'Knowledge Base | LaunchLens',
  };
}

export default async function KnowledgeListPage({ params }: KnowledgeListPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const documents = await getKnowledgeList(id);

  return <KnowledgeList project={project} documents={documents} />;
}
