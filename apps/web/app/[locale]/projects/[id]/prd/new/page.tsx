export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { PRDForm } from '@/features/prd';
import { Button, PageHeader } from '@repo/ui';

type NewPRDPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: NewPRDPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `New PRD | ${project.title} | LaunchLens`
      : 'New PRD | LaunchLens',
  };
}

export default async function NewPRDPage({ params }: NewPRDPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Create PRD" description={`New PRD for ${project.title}`} />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/prd`}>Back to list</Link>
        </Button>
      </div>
      <div className="mt-8">
        <PRDForm projectId={project.id} />
      </div>
    </>
  );
}
