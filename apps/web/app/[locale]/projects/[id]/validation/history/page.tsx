export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getValidationHistory, ValidationHistory } from '@/features/validation';

type ValidationHistoryPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ValidationHistoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Validation History | ${project.title} | AI Startup Validation Framework`
      : 'Validation History | AI Startup Validation Framework',
  };
}

export default async function ValidationHistoryPage({
  params,
}: ValidationHistoryPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const history = await getValidationHistory(id);

  return <ValidationHistory project={project} history={history} />;
}
