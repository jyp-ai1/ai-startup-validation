import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { EmptyProjectWorkspace } from '@/features/my-projects';
import { getOwnedProject } from '@/features/projects/services/project-service';
import { requireAuthUser } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

type ProjectWorkspacePageProps = {
  params: Promise<{ id: string }>;
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

export default async function ProjectWorkspacePage({ params }: ProjectWorkspacePageProps) {
  const { id } = await params;
  const user = await requireAuthUser('/my-projects');
  const project = await getOwnedProject(user.id, id);

  if (!project) {
    notFound();
  }

  return <EmptyProjectWorkspace project={project} />;
}
