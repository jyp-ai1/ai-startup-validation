import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { formatRecentActivity } from '@/features/my-projects/lib/my-project-utils';
import { getOwnedProject } from '@/features/projects/services/project-service';
import { ProjectBriefView } from '@/features/workspace/components/project-brief-view';
import { buildProjectBrief } from '@/features/workspace/lib/build-project-brief';
import { logJourneyRedirect } from '@/lib/auth/journey-redirect-audit';
import type { ProjectBriefEntry } from '@/lib/auth/journey-routes';
import { requireAuthUser } from '@/lib/auth/server-auth';
import { parseWorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projectBrief');
  const tm = await getTranslations('meta');
  return {
    title: `${t('pageTitle')} | ${tm('titleSuffix')}`,
  };
}

type ProjectBriefPageProps = {
  searchParams: Promise<{ project?: string; from?: string }>;
};

function parseEntry(from: string | undefined): ProjectBriefEntry | null {
  return from === 'list' || from === 'canvas' ? from : null;
}

function rejectToWorkspace(reason: string): never {
  logJourneyRedirect({
    layer: 'server',
    from: '/workspace/brief',
    to: '/workspace',
    reason,
  });
  redirect('/workspace');
}

/** Read-only returning-founder summary of stored AI PM state — /workspace/brief?project= */
export default async function ProjectBriefPage({ searchParams }: ProjectBriefPageProps) {
  const params = await searchParams;
  const user = await requireAuthUser('/workspace');
  const projectId = params.project?.trim();

  if (!projectId) {
    rejectToWorkspace('brief_missing_project');
  }

  const project = await getOwnedProject(user.id, projectId).catch(() => null);
  if (!project) {
    rejectToWorkspace('brief_project_not_owned');
  }

  const snapshot = parseWorkspacePersistedSnapshot(project);
  const brief = buildProjectBrief(snapshot?.aiPmLoop);
  const lastAnsweredAt = brief.kind === 'empty' ? null : brief.lastAnsweredAt;
  const summary = project.summary?.trim();

  return (
    <ProjectBriefView
      projectId={project.id}
      projectTitle={project.title}
      projectSummary={summary && summary !== project.title ? summary.slice(0, 120) : null}
      brief={brief}
      lastAnsweredLabel={lastAnsweredAt ? formatRecentActivity(lastAnsweredAt) : null}
      entry={parseEntry(params.from)}
    />
  );
}
