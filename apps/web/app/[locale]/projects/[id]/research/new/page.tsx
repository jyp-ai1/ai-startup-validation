export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button, PageHeader } from '@repo/ui';

import { getProject } from '@/features/projects/actions/project-actions';
import { ResearchForm } from '@/features/research';

type NewResearchPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewResearchPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `New Research | ${project.title} | LaunchLens`
      : 'New Research | LaunchLens',
  };
}

export default async function NewResearchPage({ params }: NewResearchPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="New Research Plan"
        description={project.title}
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/research`}>Back to research plans</Link>
        </Button>
      </div>
      <div className="mt-8">
        <ResearchForm mode="create" projectId={id} />
      </div>
    </>
  );
}
