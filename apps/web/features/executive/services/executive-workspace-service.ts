import type { ExecutionPlan } from '@/features/agents/orchestrator';
import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { DecisionResult } from '@/features/decision';
import type { StartupProject } from '@repo/types/validation';

import { buildExecutiveInbox } from './executive-inbox-service';
import { buildTypeKpis } from './kpi-registry';
import type {
  ExecutiveActionItem,
  ExecutiveEvidenceItem,
  ExecutiveKeyMetric,
  ExecutiveWorkspaceViewModel,
} from './executive-types';

const OWNER_KEYS = [
  'actions.owners.strategy',
  'actions.owners.product',
  'actions.owners.finance',
  'actions.owners.legal',
  'actions.owners.ceo',
] as const;

function competitionScore(decision: DecisionResult, stats: ProjectDashboardStats): number {
  const intensity = decision.marketAnalysis?.result.competitionIntensity;
  const map: Record<string, number> = {
    LOW: 85,
    MODERATE: 65,
    HIGH: 45,
    VERY_HIGH: 25,
  };
  if (intensity) return map[intensity] ?? 50;
  return Math.min(100, stats.competitors.total * 12 + 20);
}

function buildKeyMetrics(
  decision: DecisionResult,
  stats: ProjectDashboardStats,
): ExecutiveKeyMetric[] {
  return [
    {
      id: 'decisionScore',
      labelKey: 'metrics.decisionScore',
      value: decision.scores.decisionScore,
      format: 'score',
    },
    {
      id: 'marketScore',
      labelKey: 'metrics.marketScore',
      value: decision.marketAnalysis?.result.marketScore ?? 0,
      format: 'score',
    },
    {
      id: 'evidenceQuality',
      labelKey: 'metrics.evidenceQuality',
      value: decision.explanation.evidenceCoverage.overallPercent,
      format: 'percent',
    },
    {
      id: 'competition',
      labelKey: 'metrics.competition',
      value: competitionScore(decision, stats),
      format: 'score',
    },
    {
      id: 'execution',
      labelKey: 'metrics.execution',
      value: decision.scores.executionReadiness,
      format: 'score',
    },
    {
      id: 'confidence',
      labelKey: 'metrics.confidence',
      value: decision.scores.confidence,
      format: 'score',
    },
  ];
}

function buildActions(decision: DecisionResult): ExecutiveActionItem[] {
  return decision.recommendedActions.slice(0, 5).map((action, index) => ({
    ...action,
    ownerKey: OWNER_KEYS[index % OWNER_KEYS.length]!,
    etaDays: action.estimatedDays,
  }));
}

function buildEvidence(
  decision: DecisionResult,
  projectId: string,
): ExecutiveEvidenceItem[] {
  return decision.explanation.supportingEvidence.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    sourceKey: `evidence.source.${item.type.toLowerCase()}`,
    confidence:
      item.type === 'EVIDENCE'
        ? 88
        : item.type === 'RESEARCH'
          ? 82
          : 75,
    date: decision.generatedAt,
    href: item.href.startsWith('/') ? item.href : `/projects/${projectId}${item.href}`,
  }));
}

function buildSummaryKeys(decision: DecisionResult): string[] {
  if (decision.executiveSummaryKeys.length >= 3) {
    return decision.executiveSummaryKeys.slice(0, 5);
  }
  return [
    'summary.line1',
    'summary.line2',
    'summary.line3',
    ...(decision.verdict === 'HOLD' ? ['summary.line4'] : []),
  ];
}

/** Assemble Executive Decision Workspace view model. */
export function buildExecutiveWorkspace(
  project: StartupProject,
  stats: ProjectDashboardStats,
  decision: DecisionResult,
  orchestratorPlan: ExecutionPlan | null,
): ExecutiveWorkspaceViewModel {
  return {
    project,
    stats,
    decision,
    orchestratorPlan,
    verdict: decision.verdict,
    stage: project.status,
    confidence: decision.scores.confidence,
    summaryKeys: buildSummaryKeys(decision),
    summaryParams: decision.executiveSummaryParams,
    typeKpis: buildTypeKpis(project.projectType, stats, decision),
    keyMetrics: buildKeyMetrics(decision, stats),
    risks: decision.risks.slice(0, 5),
    opportunities: decision.opportunities.slice(0, 5),
    actions: buildActions(decision),
    evidence: buildEvidence(decision, project.id),
    inbox: buildExecutiveInbox(decision),
    projectType: project.projectType,
  };
}
