import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ProjectWizard, DemoEntryTracker } from '@/features/activation';
import { getLatestPlan } from '@/features/agents/orchestrator';
import { generateProjectDecision } from '@/features/decision';
import {
  buildExecutiveWorkspace,
  ExecutiveDashboard,
} from '@/features/executive';
import { getExecutiveReport } from '@/features/report-engine';
import { buildStrategyWorkspace } from '@/features/strategy-workspace';
import { buildConsultantViewModel } from '@/features/ai-consultant';
import {
  getProjectOnboardingContext,
  isOnboardingComplete,
  parseOnboardingContext,
} from '@/features/onboarding-consultant';
import { getWorkspaceSession } from '@/lib/auth/workspace-session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('nav.dashboard')} | ${t('meta.titleSuffix')}`,
    robots: { index: false, follow: false },
  };
}

type DashboardPageProps = {
  searchParams: Promise<{ project?: string; demo?: string; onboarding?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();

  if (params.project) {
    cookieStore.set('ACTIVE_PROJECT_ID', params.project, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  const session = await getWorkspaceSession(params.project ?? null);
  const { user, demoMode, workspace } = session;

  if (!user && !demoMode) {
    redirect('/auth/login?next=/dashboard');
  }

  if (user && !demoMode && workspace.projectCount === 0) {
    return <ProjectWizard />;
  }

  let executive = null;
  let strategy = null;
  let consultant = null;
  let onboardingComplete = false;

  if (workspace.activeProject && workspace.stats) {
    const projectId = workspace.activeProject.id;
    const onboardingContext =
      parseOnboardingContext(workspace.activeProject.onboardingContext) ??
      (await getProjectOnboardingContext(projectId));
    onboardingComplete = isOnboardingComplete(onboardingContext);

    const decision = await generateProjectDecision(projectId);
    const orchestratorPlan = await getLatestPlan(projectId);
    const executiveReport = await getExecutiveReport(projectId);
    if (decision) {
      executive = buildExecutiveWorkspace(
        workspace.activeProject,
        workspace.stats,
        decision,
        orchestratorPlan,
      );
    }
    strategy = buildStrategyWorkspace({
      stats: workspace.stats,
      executive,
      hasExecutiveReport: Boolean(executiveReport),
    });
    consultant = buildConsultantViewModel({
      stats: workspace.stats,
      executive,
      strategy,
      hasExecutiveReport: Boolean(executiveReport),
      orchestratorPlan,
      onboardingContext,
    });
  }

  return (
    <>
      <DemoEntryTracker enabled={Boolean(params.demo)} />
      <ExecutiveDashboard
        workspace={workspace}
        executive={executive}
        strategy={strategy}
        consultant={consultant}
        demoMode={demoMode}
        onboardingComplete={onboardingComplete}
      />
    </>
  );
}
