export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getValidationScore, ValidationDashboard } from '@/features/validation';

type ValidationPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ValidationPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Validation Score | ${project.title} | LaunchLens`
      : 'Validation Score | LaunchLens',
  };
}

export default async function ValidationPage({ params }: ValidationPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const score = await getValidationScore(id);

  return <ValidationDashboard project={project} score={score} />;
}
