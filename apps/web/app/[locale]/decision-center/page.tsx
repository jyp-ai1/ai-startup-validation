import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

import { generateProjectDecision } from '@/features/decision';
import { DecisionCenterView } from '@/features/decision/components/decision-center-view';
import { getWorkspaceContext } from '@/features/dashboard/services/dashboard-service';
import { Button, EmptyState } from '@repo/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('nav.decisionCenter')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function DecisionCenterPage() {
  const t = await getTranslations('decision');
  const cookieStore = await cookies();
  const preferredProjectId = cookieStore.get('ACTIVE_PROJECT_ID')?.value ?? null;
  const workspace = await getWorkspaceContext(preferredProjectId);

  if (!workspace.stats || !workspace.activeProject) {
    return (
      <>
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            <Button asChild>
              <Link href="/projects/new">{t('createProject')}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const decision = await generateProjectDecision(workspace.activeProject.id);
  if (!decision) notFound();

  return (
    <DecisionCenterView
      decision={decision}
      projectId={workspace.activeProject.id}
      projectTitle={workspace.activeProject.title}
    />
  );
}
