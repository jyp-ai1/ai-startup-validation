export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getPRD, PRDDetail } from '@/features/prd';

type PRDDetailPageProps = {
  params: Promise<{ id: string; prdId: string }>;
};

export async function generateMetadata({ params }: PRDDetailPageProps): Promise<Metadata> {
  const { id, prdId } = await params;
  const project = await getProject(id);
  const prd = await getPRD(id, prdId);

  return {
    title: prd
      ? `${prd.title} | AI Startup Validation Framework`
      : project
        ? `PRD | ${project.title} | AI Startup Validation Framework`
        : 'PRD | AI Startup Validation Framework',
  };
}

export default async function PRDDetailPage({ params }: PRDDetailPageProps) {
  const { id, prdId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const prd = await getPRD(id, prdId);

  if (!prd) {
    notFound();
  }

  return <PRDDetail project={project} prd={prd} />;
}
