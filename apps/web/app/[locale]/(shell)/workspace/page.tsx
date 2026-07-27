import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MyProjectsHome } from '@/features/my-projects';
import {
  bootstrapFirstProject,
  listMyProjectsForPage,
} from '@/features/my-projects/actions/my-project-actions';
import { WorkspaceAuthCompleteTracker } from '@/features/workspace/components/workspace-auth-complete-tracker';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('myProjects');
  const tm = await getTranslations('meta');
  return {
    title: `${t('pageTitle')} | ${tm('titleSuffix')}`,
  };
}

type WorkspaceHomePageProps = {
  searchParams: Promise<{ from?: string; auth?: string }>;
};

/** Protected Workspace home — login required (Sprint 2 P0 IA). */
export default async function WorkspaceHomePage({ searchParams }: WorkspaceHomePageProps) {
  const params = await searchParams;
  const { user, projects, dbReady } = await listMyProjectsForPage();

  if (dbReady && projects.length === 0) {
    const project = await bootstrapFirstProject(user.id, params.from === 'demo');
    const { redirect } = await import('next/navigation');
    const qs = new URLSearchParams({ welcome: '1' });
    if (params.auth === 'complete') qs.set('auth', 'complete');
    redirect(`/my-projects/${project.id}?${qs.toString()}`);
  }

  return (
    <>
      <WorkspaceAuthCompleteTracker />
      <MyProjectsHome
        userName={user.fullName}
        userEmail={user.email}
        projects={projects}
        dbReady={dbReady}
      />
    </>
  );
}
