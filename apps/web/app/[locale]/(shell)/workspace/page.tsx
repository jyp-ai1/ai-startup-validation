import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { MyProjectsHome } from '@/features/my-projects';
import {
  bootstrapFirstProject,
  listMyProjectsForPage,
  promoteDemoProject,
} from '@/features/my-projects/actions/my-project-actions';
import { listDemoProjects, getOwnedProject } from '@/features/projects/services/project-service';
import { readJourneyPersona } from '@/features/workflow-journey/lib/v2-journey-cookies';
import { WorkspaceProjectCanvas } from '@/features/workspace/components/workspace-project-canvas';
import { WorkspaceAuthCompleteTracker } from '@/features/workspace/components/workspace-auth-complete-tracker';
import { WorkspaceJourneyTracker } from '@/features/workspace/components/journey-page-tracker';
import { buildAuthenticatedJourneyUrl } from '@/lib/auth/journey-routes';
import { logJourneyRedirect } from '@/lib/auth/journey-redirect-audit';
import {
  DEMO_GUEST_USER,
  isDemoQueryParam,
  isDemoWorkspace,
} from '@/lib/auth/server-auth';
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
    intent?: string;
  }>;
};

/** Protected Workspace — canonical entry: /workspace?project= */
export default async function WorkspaceHomePage({ searchParams }: WorkspaceHomePageProps) {
  const params = await searchParams;
  const demoCookie = await isDemoWorkspace();
  const demoEntry = demoCookie || isDemoQueryParam(params.demo);

  if (demoEntry) {
    const cookieStore = await cookies();
    let projectId = params.project ?? cookieStore.get('ACTIVE_PROJECT_ID')?.value;
    if (!projectId) {
      const demos = await listDemoProjects();
      projectId = demos[0]?.id ?? 'demo';
    }
    const user = DEMO_GUEST_USER;
    const demoMode =
      params.demo === 'readonly'
        ? 'demo-readonly'
        : params.demo === 'guided' || params.demo === '1' || demoCookie
          ? 'demo-guided'
          : 'demo-guided';

    return (
      <>
        <WorkspaceJourneyTracker />
        <WorkspaceProjectCanvas projectId={projectId} user={user} demoMode={demoMode} />
      </>
    );
  }

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

  if (dbReady && params.intent === 'new') {
    const project = await bootstrapFirstProject(user.id, false);
    redirect(
      buildAuthenticatedJourneyUrl({
        projectId: project.id,
        welcome: true,
        authComplete,
      }),
    );
  }

  const resolvedProjectId = params.project;

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
