export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { ValidationAgentPanel } from '@/features/validation-agent';

type ValidationAgentPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ValidationAgentPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Validation Agent | ${project.title} | AI Startup Validation Framework`
      : 'Validation Agent | AI Startup Validation Framework',
  };
}

export default async function ValidationAgentPage({ params }: ValidationAgentPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return <ValidationAgentPanel project={project} />;
}
