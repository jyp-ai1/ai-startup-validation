import { getLocale } from 'next-intl/server';

import { buildProjectDashboardStats } from '@/features/dashboard/services/dashboard-service';
import { listCompetitors } from '@/features/competitors/services/competitor-service';
import { listEvidence } from '@/features/evidence/services/evidence-service';
import { listGrants } from '@/features/grants/services/grant-service';
import { runFrameworkAnalysisForDecision } from '@/features/framework/services/framework-service';
import { listResearchPlans } from '@/features/research/services/research-service';
import { listVOCEntries } from '@/features/voc/services/voc-service';

import { decisionService } from './decision-engine';
import { enrichDecisionInput, statsToDecisionInput } from './decision-input';
import type { DecisionInput, DecisionResult } from './decision-types';

async function loadSupportingItems(projectId: string): Promise<DecisionInput['supportingItems']> {
  const [evidence, voc, research, competitors, grants] = await Promise.all([
    listEvidence(projectId),
    listVOCEntries(projectId),
    listResearchPlans(projectId),
    listCompetitors(projectId),
    listGrants(projectId),
  ]);

  return {
    evidence: evidence.slice(0, 5).map((e) => ({ id: e.id, title: e.title })),
    voc: voc.slice(0, 5).map((v) => ({ id: v.id, title: v.title })),
    research: research.slice(0, 5).map((r) => ({ id: r.id, title: r.title })),
    competitors: competitors.slice(0, 5).map((c) => ({ id: c.id, title: c.name })),
    grants: grants.slice(0, 5).map((g) => ({ id: g.id, title: g.name })),
  };
}

export async function generateProjectDecision(
  projectId: string,
): Promise<DecisionResult | null> {
  const stats = await buildProjectDashboardStats(projectId);
  if (!stats) return null;

  const locale = await getLocale();
  const [grants, supportingItems] = await Promise.all([
    listGrants(projectId),
    loadSupportingItems(projectId),
  ]);

  const avgFitScore =
    grants.length > 0
      ? Math.round(grants.reduce((sum, g) => sum + (g.fitScore ?? 0), 0) / grants.length)
      : null;

  const input = enrichDecisionInput(
    {
      ...statsToDecisionInput(stats, locale as DecisionInput['locale']),
      supportingItems,
    },
    avgFitScore,
  );

  const frameworkAnalysis = await runFrameworkAnalysisForDecision(
    input,
    stats.project.industry,
    stats.project.status,
  );

  return decisionService.generateDecision({ ...input, frameworkAnalysis });
}

export type { DecisionResult } from './decision-types';
