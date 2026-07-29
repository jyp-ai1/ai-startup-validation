import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { MyProjectsHome } from '@/features/my-projects';
import {
  bootstrapFirstProject,
  listMyProjectsForPage,
  promoteDemoProject,
} from '@/features/my-projects/actions/my-project-actions';
import { getOwnedProject } from '@/features/projects/services/project-service';
import { readJourneyPersona } from '@/features/workflow-journey/lib/v2-journey-cookies';
import { WorkspaceProjectCanvas } from '@/features/workspace/components/workspace-project-canvas';
import { WorkspaceAuthCompleteTracker } from '@/features/workspace/components/workspace-auth-complete-tracker';
import { WorkspaceJourneyTracker } from '@/features/workspace/components/journey-page-tracker';
import { buildAuthenticatedJourneyUrl } from '@/lib/auth/journey-routes';
import { logJourneyRedirect } from '@/lib/auth/journey-redirect-audit';
import { isSupabaseConfigured } from '@repo/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('myProjects');
  const tm = await getTranslations('meta');
  return {
    title: `${t('pageTitle')} | ${tm('titleSuffix')}`,
  };
}

type WorkspaceHomePageProps = {
  searchParams: Promise<{
    from?: string;
    auth?: string;
    promote?: string;
    project?: string;
    welcome?: string;
    promoted?: string;
    demo?: string;
  }>;
};

/** Protected Workspace — canonical entry: /workspace?project= */
export default async function WorkspaceHomePage({ searchParams }: WorkspaceHomePageProps) {
  const params = await searchParams;
  const { user, projects, dbReady } = await listMyProjectsForPage();
  const promoteDemo = params.from === 'demo' && params.promote === '1';
  const authComplete = params.auth === 'complete';
  const welcome = params.welcome === '1';
  const promoted = params.promoted === '1';

  if (dbReady && promoteDemo) {
    const project = await promoteDemoProject(user.id);
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
      logJourneyRedirect({
        layer: 'server',
        from: '/workspace',
        to: buildAuthenticatedJourneyUrl({ projectId: project.id, welcome: true, authComplete }),
        reason: 'bootstrap_first_project',
      });
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

  const resolvedProjectId =
    params.project ?? (dbReady && projects.length === 1 ? projects[0]!.id : undefined);

  if (resolvedProjectId && dbReady) {
    if (isSupabaseConfigured()) {
      const owned = await getOwnedProject(user.id, resolvedProjectId);
      if (!owned) {
        logJourneyRedirect({
          layer: 'server',
          from: '/workspace',
          to: '/workspace',
          reason: 'project_not_owned',
        });
        redirect('/workspace');
      }
    }

    const needsPersona = (welcome || promoted) && !(await readJourneyPersona());

    return (
      <WorkspaceProjectCanvas
        projectId={resolvedProjectId}
        user={user}
        welcome={welcome}
        promoted={promoted}
        authComplete={authComplete}
        needsPersona={needsPersona}
        demoMode={
          params.demo === 'readonly'
            ? 'demo-readonly'
            : params.demo === 'guided' || params.demo === '1'
              ? 'demo-guided'
              : 'default'
        }
      />
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
