import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { buildProjectDashboardStats } from '@/features/dashboard/services/dashboard-service';
import { generateProjectDecision } from '@/features/decision';
import { DecisionCenterView } from '@/features/decision/components/decision-center-view';
import {
  DecisionEmptyView,
  needsDecisionEmptyState,
} from '@/features/decision/components/decision-empty-view';
import { getProject } from '@/features/projects/actions/project-actions';

type ProjectDecisionPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ProjectDecisionPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('nav.decisionCenter')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('nav.decisionCenter')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function ProjectDecisionPage({ params }: ProjectDecisionPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const stats = await buildProjectDashboardStats(id);
  if (!stats) {
    notFound();
  }

  if (needsDecisionEmptyState(stats)) {
    return (
      <DecisionEmptyView projectId={project.id} projectTitle={project.title} stats={stats} />
    );
  }

  const decision = await generateProjectDecision(id);
  if (!decision) {
    notFound();
  }

  return (
    <DecisionCenterView
      decision={decision}
      projectId={project.id}
      projectTitle={project.title}
    />
  );
}
