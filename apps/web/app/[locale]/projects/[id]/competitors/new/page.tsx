export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button, PageHeader } from '@repo/ui';

import { getProject } from '@/features/projects/actions/project-actions';
import { CompetitorForm } from '@/features/competitors';

type NewCompetitorPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewCompetitorPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `New Competitor | ${project.title} | LaunchLens`
      : 'New Competitor | LaunchLens',
  };
}

export default async function NewCompetitorPage({ params }: NewCompetitorPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader title="New Competitor" description={project.title} />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/competitors`}>Back to competitors</Link>
        </Button>
      </div>
      <div className="mt-8">
        <CompetitorForm mode="create" projectId={id} />
      </div>
    </>
  );
}
