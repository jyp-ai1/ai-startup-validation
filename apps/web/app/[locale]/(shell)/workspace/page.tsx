import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MyProjectsHome } from '@/features/my-projects';
import {
  bootstrapFirstProject,
  listMyProjectsForPage,
  promoteDemoProject,
} from '@/features/my-projects/actions/my-project-actions';
import { WorkspaceAuthCompleteTracker } from '@/features/workspace/components/workspace-auth-complete-tracker';
import { WorkspaceJourneyTracker } from '@/features/workspace/components/journey-page-tracker';
import { buildAuthenticatedJourneyUrl } from '@/lib/auth/journey-routes';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('myProjects');
  const tm = await getTranslations('meta');
  return {
    title: `${t('pageTitle')} | ${tm('titleSuffix')}`,
  };
}

type WorkspaceHomePageProps = {
  searchParams: Promise<{ from?: string; auth?: string; promote?: string }>;
};

/** Protected Workspace home — login required (Sprint 5 Epic A routing). */
export default async function WorkspaceHomePage({ searchParams }: WorkspaceHomePageProps) {
  const params = await searchParams;
  const { user, projects, dbReady } = await listMyProjectsForPage();
  const promoteDemo = params.from === 'demo' && params.promote === '1';
  const authComplete = params.auth === 'complete';

  if (dbReady && promoteDemo) {
    const project = await promoteDemoProject(user.id);
    const { redirect } = await import('next/navigation');
    redirect(
      buildAuthenticatedJourneyUrl({
        projectId: project.id,
        welcome: true,
        promoted: true,
        authComplete,
      }),
    );
  }

  if (dbReady && projects.length === 0) {
    try {
      const project = await bootstrapFirstProject(user.id, false);
      const { redirect } = await import('next/navigation');
      redirect(
        buildAuthenticatedJourneyUrl({
          projectId: project.id,
          welcome: true,
          authComplete,
        }),
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[workspace] bootstrapFirstProject failed', {
        userId: user.id,
        message: err.message,
        stack: err.stack,
        authComplete,
      });
      throw error;
    }
  }

  if (dbReady && projects.length === 1) {
    const { redirect } = await import('next/navigation');
    const only = projects[0]!;
    redirect(
      buildAuthenticatedJourneyUrl({
        projectId: only.id,
        authComplete,
      }),
    );
  }

  return (
    <>
      <WorkspaceJourneyTracker />
      <WorkspaceAuthCompleteTracker promoted={false} />
      <MyProjectsHome
        userName={user.fullName}
        userEmail={user.email}
        projects={projects}
        dbReady={dbReady}
      />
    </>
  );
}
