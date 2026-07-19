export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getPRDList } from '@/features/prd';
import { DevelopmentSpecForm } from '@/features/development-spec';
import { Button, PageHeader } from '@repo/ui';

type NewDevelopmentSpecPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewDevelopmentSpecPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `New Development Spec | ${project.title} | AI Startup Validation Framework`
      : 'New Development Spec | AI Startup Validation Framework',
  };
}

export default async function NewDevelopmentSpecPage({
  params,
}: NewDevelopmentSpecPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const prds = await getPRDList(id);
  if (prds.length === 0) {
    redirect(`/projects/${id}/prd`);
  }

  return (
    <>
      <PageHeader
        title="Create Development Spec"
        description={`New engineering spec for ${project.title}`}
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/development-spec`}>Back to list</Link>
        </Button>
      </div>
      <div className="mt-8">
        <DevelopmentSpecForm projectId={project.id} prds={prds} />
      </div>
    </>
  );
}
