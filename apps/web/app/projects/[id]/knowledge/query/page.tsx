export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { KnowledgeQueryPanel } from '@/features/knowledge';

type KnowledgeQueryPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: KnowledgeQueryPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Knowledge Query | ${project.title} | AI Startup Validation Framework`
      : 'Knowledge Query | AI Startup Validation Framework',
  };
}

export default async function KnowledgeQueryPage({ params }: KnowledgeQueryPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return <KnowledgeQueryPanel project={project} />;
}
