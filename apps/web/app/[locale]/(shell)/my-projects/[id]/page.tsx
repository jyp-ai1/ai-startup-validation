import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { GuidedInterviewEntry } from '@/features/interview';
import { DemoProjectPromotedTracker } from '@/features/my-projects/components/demo-project-promoted-tracker';
import { getOwnedProject } from '@/features/projects/services/project-service';
import { WorkspaceAuthCompleteTracker } from '@/features/workspace/components/workspace-auth-complete-tracker';
import { requireAuthUser } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

type ProjectWorkspacePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ promoted?: string }>;
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

export default async function ProjectWorkspacePage({
  params,
  searchParams,
}: ProjectWorkspacePageProps) {
  const { id } = await params;
  const { promoted } = await searchParams;
  const user = await requireAuthUser('/my-projects');
  const project = await getOwnedProject(user.id, id);

  if (!project) {
    notFound();
  }

  return (
    <>
      <WorkspaceAuthCompleteTracker />
      {promoted === '1' ? <DemoProjectPromotedTracker /> : null}
      <GuidedInterviewEntry project={project} />
    </>
  );
}
