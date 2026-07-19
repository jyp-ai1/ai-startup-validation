export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getGrantDetail, GrantDetail } from '@/features/grants';

type GrantDetailPageProps = {
  params: Promise<{ id: string; grantId: string }>;
};

export async function generateMetadata({
  params,
}: GrantDetailPageProps): Promise<Metadata> {
  const { id, grantId } = await params;
  const grant = await getGrantDetail(id, grantId);

  return {
    title: grant
      ? `${grant.name} | AI Startup Validation Framework`
      : 'Grant | AI Startup Validation Framework',
  };
}

export default async function GrantDetailPage({ params }: GrantDetailPageProps) {
  const { id, grantId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const grant = await getGrantDetail(id, grantId);

  if (!grant) {
    notFound();
  }

  return <GrantDetail project={project} grant={grant} />;
}
