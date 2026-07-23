import type {
  CompetitorMarketPosition,
  EvidenceConfidence,
  StartupProject,
} from '@repo/types/validation';

import { listEvidence } from '@/features/evidence/services/evidence-service';
import { listCompetitors } from '@/features/competitors/services/competitor-service';
import { listGrants } from '@/features/grants/services/grant-service';
import {
  findStartupProject,
  listStartupProjects,
} from '@/features/projects/services/project-service';
import { listResearchPlans } from '@/features/research/services/research-service';
import { listReports } from '@/features/reports/services/report-service';
import { listVOCEntries } from '@/features/voc/services/voc-service';
import { findLatestValidationScore } from '@/features/validation/services/validation-service';

import type {
  DashboardActivity,
  DashboardNextAction,
  ProjectDashboardStats,
  WorkspaceContext,
} from '../types';

const CONFIDENCE_LEVELS: EvidenceConfidence[] = ['HIGH', 'MEDIUM', 'LOW'];
const MARKET_POSITIONS: CompetitorMarketPosition[] = [
  'LEADER',
  'CHALLENGER',
  'FOLLOWER',
  'NEWCOMER',
];

function pickActiveProject(
  projects: StartupProject[],
  preferredId?: string | null,
): StartupProject | null {
  if (projects.length === 0) return null;
  if (preferredId) {
    const match = projects.find((p) => p.id === preferredId);
    if (match) return match;
  }
  return [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]!;
}

function buildRecentActivity(
  projectId: string,
  items: {
    evidence: Awaited<ReturnType<typeof listEvidence>>;
    voc: Awaited<ReturnType<typeof listVOCEntries>>;
    validation: Awaited<ReturnType<typeof findLatestValidationScore>>;
    reports: Awaited<ReturnType<typeof listReports>>;
    research: Awaited<ReturnType<typeof listResearchPlans>>;
    competitors: Awaited<ReturnType<typeof listCompetitors>>;
  },
): DashboardActivity[] {
  const activities: DashboardActivity[] = [];

  for (const item of items.evidence) {
    activities.push({
      id: `evidence-${item.id}`,
      type: 'EVIDENCE',
      label: item.title,
      occurredAt: item.updatedAt,
    });
  }
  for (const item of items.voc) {
    activities.push({
      id: `voc-${item.id}`,
      type: 'VOC',
      label: item.title,
      occurredAt: item.updatedAt,
    });
  }
  if (items.validation) {
    activities.push({
      id: `validation-${items.validation.id}`,
      type: 'VALIDATION',
      label: `Score ${items.validation.totalScore}`,
      occurredAt: items.validation.updatedAt,
    });
  }
  for (const item of items.reports) {
    activities.push({
      id: `report-${item.id}`,
      type: 'REPORT',
      label: item.title,
      occurredAt: item.updatedAt,
    });
  }
  for (const item of items.research) {
    activities.push({
      id: `research-${item.id}`,
      type: 'RESEARCH',
      label: item.title,
      occurredAt: item.updatedAt,
    });
  }
  for (const item of items.competitors) {
    activities.push({
      id: `competitor-${item.id}`,
      type: 'COMPETITOR',
      label: item.name,
      occurredAt: item.updatedAt,
    });
  }

  return activities
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 6);
}

function buildNextActions(
  projectId: string,
  stats: Omit<ProjectDashboardStats, 'nextActions' | 'timeline'>,
): DashboardNextAction[] {
  const actions: DashboardNextAction[] = [
    {
      id: 'voc-volume',
      labelKey: 'dashboard.actions.vocVolume',
      href: `/projects/${projectId}/voc`,
      completed: stats.voc.total >= 20,
    },
    {
      id: 'competitors',
      labelKey: 'dashboard.actions.addCompetitors',
      href: `/projects/${projectId}/competitors`,
      completed: stats.competitors.total >= 3,
    },
    {
      id: 'evidence-high',
      labelKey: 'dashboard.actions.evidenceQuality',
      href: `/projects/${projectId}/evidence`,
      completed: stats.evidence.byConfidence.HIGH >= 10,
    },
    {
      id: 'research',
      labelKey: 'dashboard.actions.completeResearch',
      href: `/projects/${projectId}/research`,
      completed: stats.research.progressPercent >= 100,
    },
    {
      id: 'validation',
      labelKey: 'dashboard.actions.runValidation',
      href: `/projects/${projectId}/validation`,
      completed: stats.validationScore !== null && stats.validationScore.decision !== 'DRAFT',
    },
  ];

  return actions;
}

export async function buildProjectDashboardStats(
  projectId: string,
): Promise<ProjectDashboardStats | null> {
  const project = await findStartupProject(projectId);
  if (!project) return null;

  const [researchPlans, evidence, voc, competitors, grants, validationScore, reports] =
    await Promise.all([
      listResearchPlans(projectId),
      listEvidence(projectId),
      listVOCEntries(projectId),
      listCompetitors(projectId),
      listGrants(projectId),
      findLatestValidationScore(projectId),
      listReports(projectId),
    ]);

  const researchCompleted = researchPlans.filter((p) => p.status === 'COMPLETED').length;
  const researchTotal = researchPlans.length;
  const researchProgressPercent =
    researchTotal === 0 ? 0 : Math.round((researchCompleted / researchTotal) * 100);

  const evidenceByConfidence = CONFIDENCE_LEVELS.reduce(
    (acc, level) => {
      acc[level] = evidence.filter((e) => e.confidence === level).length;
      return acc;
    },
    { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<EvidenceConfidence, number>,
  );

  const competitorsByPosition = MARKET_POSITIONS.reduce(
    (acc, position) => {
      acc[position] = competitors.filter((c) => c.marketPosition === position).length;
      return acc;
    },
    { LEADER: 0, CHALLENGER: 0, FOLLOWER: 0, NEWCOMER: 0 } as Record<
      CompetitorMarketPosition,
      number
    >,
  );

  const baseStats = {
    project,
    validationScore,
    research: {
      total: researchTotal,
      completed: researchCompleted,
      progressPercent: researchProgressPercent,
    },
    evidence: {
      total: evidence.length,
      byConfidence: evidenceByConfidence,
    },
    voc: { total: voc.length },
    competitors: {
      total: competitors.length,
      byPosition: competitorsByPosition,
    },
    grants: { total: grants.length },
    recentActivity: buildRecentActivity(projectId, {
      evidence,
      voc,
      validation: validationScore,
      reports,
      research: researchPlans,
      competitors,
    }),
  };

  const activities = baseStats.recentActivity;
  const upcomingDeadlines = grants
    .filter((g) => g.deadline && new Date(g.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5)
    .map((g) => ({
      id: g.id,
      title: g.name,
      deadline: g.deadline!,
      href: `/projects/${projectId}/grants/${g.id}`,
    }));

  return {
    ...baseStats,
    nextActions: buildNextActions(projectId, baseStats),
    timeline: {
      recentDocuments: activities.filter((a) => a.type === 'REPORT').slice(0, 5),
      recentAiResults: activities
        .filter((a) => a.type === 'REPORT' || a.type === 'VALIDATION')
        .slice(0, 5),
      upcomingDeadlines,
      validationUpdatedAt: validationScore?.updatedAt ?? null,
    },
  };
}

export async function getWorkspaceContext(
  preferredProjectId?: string | null,
  options?: { userId?: string | null; demoMode?: boolean },
): Promise<WorkspaceContext> {
  const { userId, demoMode = false } = options ?? {};

  let projects: Awaited<ReturnType<typeof listStartupProjects>>;
  if (demoMode) {
    const { listDemoProjects } = await import('@/features/projects/services/project-service');
    projects = await listDemoProjects();
  } else if (userId) {
    const { listUserProjects } = await import('@/features/projects/services/project-service');
    projects = await listUserProjects(userId);
  } else {
    projects = await listStartupProjects();
  }

  const activeProject = pickActiveProject(projects, preferredProjectId);
  const stats = activeProject
    ? await buildProjectDashboardStats(activeProject.id)
    : null;

  return {
    activeProject,
    projectCount: projects.length,
    stats,
  };
}

export type ProjectOverviewCard = {
  project: StartupProject;
  validationScore: Awaited<ReturnType<typeof findLatestValidationScore>>;
  researchProgress: number;
  evidenceCount: number;
  vocCount: number;
  competitorCount: number;
};

export async function buildProjectsOverview(): Promise<ProjectOverviewCard[]> {
  const projects = await listStartupProjects();
  if (projects.length === 0) return [];

  const cards = await Promise.all(
    projects.map(async (project) => {
      const [researchPlans, evidence, voc, competitors, validationScore] = await Promise.all([
        listResearchPlans(project.id),
        listEvidence(project.id),
        listVOCEntries(project.id),
        listCompetitors(project.id),
        findLatestValidationScore(project.id),
      ]);

      const completed = researchPlans.filter((p) => p.status === 'COMPLETED').length;
      const researchProgress =
        researchPlans.length === 0 ? 0 : Math.round((completed / researchPlans.length) * 100);

      return {
        project,
        validationScore,
        researchProgress,
        evidenceCount: evidence.length,
        vocCount: voc.length,
        competitorCount: competitors.length,
      };
    }),
  );

  return cards.sort(
    (a, b) =>
      new Date(b.project.updatedAt).getTime() - new Date(a.project.updatedAt).getTime(),
  );
}
