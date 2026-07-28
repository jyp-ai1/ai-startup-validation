import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getOwnedProject } from '@/features/projects/services/project-service';
import { buildAuthenticatedJourneyUrl } from '@/lib/auth/journey-routes';
import { requireAuthUser } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

type ProjectWorkspacePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ promoted?: string; welcome?: string; auth?: string }>;
};

export async function generateMetadata({ params }: ProjectWorkspacePageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await requireAuthUser('/my-projects');
  const project = await getOwnedProject(user.id, id);
  const tm = await getTranslations('meta');
  return {
    title: project ? `${project.title} | ${tm('titleSuffix')}` : tm('titleSuffix'),
  };
}

/** Legacy route — unified with Demo canvas at /validation (Sprint 5.1). */
export default async function ProjectWorkspacePage({
  params,
  searchParams,
}: ProjectWorkspacePageProps) {
  const { id } = await params;
  const qs = await searchParams;
  const user = await requireAuthUser('/my-projects');
  const project = await getOwnedProject(user.id, id);

  if (!project) {
    notFound();
  }

  redirect(
    buildAuthenticatedJourneyUrl({
      projectId: project.id,
      welcome: qs.welcome === '1',
      authComplete: qs.auth === 'complete',
      promoted: qs.promoted === '1',
    }),
  );
}
