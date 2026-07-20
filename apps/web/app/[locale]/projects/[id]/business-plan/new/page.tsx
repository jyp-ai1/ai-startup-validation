export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { BusinessPlanForm } from '@/features/business-plan';
import { Button, PageHeader } from '@repo/ui';

type NewBusinessPlanPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewBusinessPlanPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `New Business Plan | ${project.title} | LaunchLens`
      : 'New Business Plan | LaunchLens',
  };
}

export default async function NewBusinessPlanPage({ params }: NewBusinessPlanPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Create Business Plan"
        description={`New plan for ${project.title}`}
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/business-plan`}>Back to list</Link>
        </Button>
      </div>
      <div className="mt-8">
        <BusinessPlanForm projectId={project.id} />
      </div>
    </>
  );
}
