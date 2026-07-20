export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getValidationScore, ValidationSummary } from '@/features/validation';

type ValidationSummaryPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ValidationSummaryPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `Validation Summary | ${project.title} | LaunchLens`
      : 'Validation Summary | LaunchLens',
  };
}

export default async function ValidationSummaryPage({
  params,
}: ValidationSummaryPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const score = await getValidationScore(id);

  return <ValidationSummary project={project} score={score} />;
}
