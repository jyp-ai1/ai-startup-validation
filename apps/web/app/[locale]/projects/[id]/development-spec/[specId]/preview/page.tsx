export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getDevelopmentSpec, DevelopmentSpecPreview } from '@/features/development-spec';

type DevelopmentSpecPreviewPageProps = {
  params: Promise<{ id: string; specId: string }>;
};

export async function generateMetadata({
  params,
}: DevelopmentSpecPreviewPageProps): Promise<Metadata> {
  const { id, specId } = await params;
  const spec = await getDevelopmentSpec(id, specId);

  return {
    title: spec
      ? `Preview: ${spec.title} | LaunchLens`
      : 'Development Spec Preview | LaunchLens',
  };
}

export default async function DevelopmentSpecPreviewPage({
  params,
}: DevelopmentSpecPreviewPageProps) {
  const { id, specId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const spec = await getDevelopmentSpec(id, specId);

  if (!spec) {
    notFound();
  }

  return <DevelopmentSpecPreview project={project} spec={spec} />;
}
