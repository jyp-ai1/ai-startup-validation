export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getPRD, PRDPreview } from '@/features/prd';

type PRDPreviewPageProps = {
  params: Promise<{ id: string; prdId: string }>;
};

export async function generateMetadata({ params }: PRDPreviewPageProps): Promise<Metadata> {
  const { id, prdId } = await params;
  const prd = await getPRD(id, prdId);

  return {
    title: prd
      ? `Preview: ${prd.title} | LaunchLens`
      : 'PRD Preview | LaunchLens',
  };
}

export default async function PRDPreviewPage({ params }: PRDPreviewPageProps) {
  const { id, prdId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const prd = await getPRD(id, prdId);

  if (!prd) {
    notFound();
  }

  return <PRDPreview project={project} prd={prd} />;
}
