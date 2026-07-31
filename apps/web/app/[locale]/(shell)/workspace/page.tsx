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
import { WorkspaceProjectCanvas } from '@/features/workspace/components/workspace-project-canvas';
import { WorkspaceAuthCompleteTracker } from '@/features/workspace/components/workspace-auth-complete-tracker';
import { WorkspaceListCookieCleanup } from '@/features/workspace/components/workspace-list-cookie-cleanup';
import { WorkspaceJourneyTracker } from '@/features/workspace/components/journey-page-tracker';
import { buildAuthenticatedJourneyUrl } from '@/lib/auth/journey-routes';
import { logJourneyRedirect } from '@/lib/auth/journey-redirect-audit';
import {
  DEMO_GUEST_USER,
  getServerAuthUser,
  isDemoQueryParam,
  isDemoWorkspace,
} from '@/lib/auth/server-auth';
import { isDemoSampleId } from '@/features/workflow-journey/lib/demo-samples';
import { extractProjectSeedDocument } from '@/lib/project/project-seed-document';
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
    sample?: string;
    fresh?: string;
  }>;
};

/** Protected Workspace — canonical entry: /workspace?project= */
export default async function WorkspaceHomePage({ searchParams }: WorkspaceHomePageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const demoCookie = await isDemoWorkspace();
  const demoQuery = isDemoQueryParam(params.demo);
  const authUser = await getServerAuthUser();
  const explicitDemoSession = demoQuery && Boolean(params.sample) && params.fresh === '1';
  const guestDemoEntry = (demoQuery || demoCookie) && !authUser && !explicitDemoSession;
  const showDemoWorkspace = explicitDemoSession || guestDemoEntry;

  if (showDemoWorkspace) {
    if (!params.sample || params.fresh !== '1') {
      redirect('/demo/start');
    }

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
    const demoSampleId = isDemoSampleId(params.sample) ? params.sample : 'launchlens';

    return (
      <>
        <WorkspaceJourneyTracker />
        <WorkspaceProjectCanvas
          projectId={projectId}
          user={user}
          demoMode={demoMode}
          demoSampleId={demoSampleId}
          demoFresh
        />
      </>
    );
  }

  const { user, projects, dbReady } = await listMyProjectsForPage();
  const promoteDemo = params.from === 'demo' && params.promote === '1';
  const authComplete = params.auth === 'complete';
  const welcome = params.welcome === '1';
  const promoted = params.promoted === '1';

  if (dbReady && promoteDemo) {
    await promoteDemoProject(user.id);
    redirect(`/workspace?promoted=1${authComplete ? '&auth=complete' : ''}`);
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
  const clearStaleDemoMode = Boolean(authUser && demoCookie && !demoQuery && !promoteDemo);

  if (resolvedProjectId && dbReady) {
    if (authComplete && !welcome && !promoted) {
      redirect('/workspace?auth=complete');
    }

    let owned = null;
    if (isSupabaseConfigured()) {
      owned = await getOwnedProject(user.id, resolvedProjectId);
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

    const seedDocument =
      owned && !welcome ? extractProjectSeedDocument(owned) : undefined;

    return (
      <WorkspaceProjectCanvas
        projectId={resolvedProjectId}
        user={user}
        welcome={welcome}
        promoted={promoted}
        authComplete={authComplete}
        needsPersona={false}
        seedDocument={seedDocument}
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
      <WorkspaceListCookieCleanup clearStaleDemoMode={clearStaleDemoMode} />
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
