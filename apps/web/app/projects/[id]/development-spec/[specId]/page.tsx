export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getDevelopmentSpec, DevelopmentSpecDetail } from '@/features/development-spec';

type DevelopmentSpecDetailPageProps = {
  params: Promise<{ id: string; specId: string }>;
};

export async function generateMetadata({
  params,
}: DevelopmentSpecDetailPageProps): Promise<Metadata> {
  const { id, specId } = await params;
  const project = await getProject(id);
  const spec = await getDevelopmentSpec(id, specId);

  return {
    title: spec
      ? `${spec.title} | AI Startup Validation Framework`
      : project
        ? `Development Spec | ${project.title} | AI Startup Validation Framework`
        : 'Development Spec | AI Startup Validation Framework',
  };
}

export default async function DevelopmentSpecDetailPage({
  params,
}: DevelopmentSpecDetailPageProps) {
  const { id, specId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const spec = await getDevelopmentSpec(id, specId);

  if (!spec) {
    notFound();
  }

  return <DevelopmentSpecDetail project={project} spec={spec} />;
}
