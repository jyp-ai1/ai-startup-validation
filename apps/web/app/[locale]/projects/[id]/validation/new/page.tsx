export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { Button, PageHeader } from '@repo/ui';
import { ValidationScoreForm } from '@/features/validation';

type NewValidationPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewValidationPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `New Validation Score | ${project.title} | LaunchLens`
      : 'New Validation Score | LaunchLens',
  };
}

export default async function NewValidationPage({ params }: NewValidationPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Create Validation Score"
        description={`Evaluate ${project.title} across six dimensions`}
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/validation`}>Back to dashboard</Link>
        </Button>
      </div>
      <div className="mt-8">
        <ValidationScoreForm mode="create" projectId={project.id} />
      </div>
    </>
  );
}
