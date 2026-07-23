import type { ProjectType } from '@repo/types/validation';

import type { DecisionResult } from '@/features/decision';
import type { ProjectDashboardStats } from '@/features/dashboard/types';

import type { ExecutiveKpiValue } from './executive-types';

type KpiDefinition = {
  id: string;
  labelKey: string;
  placeholder?: boolean;
  compute: (ctx: KpiContext) => ExecutiveKpiValue;
};

type KpiContext = {
  stats: ProjectDashboardStats;
  decision: DecisionResult;
};

const STARTUP_KPIS: KpiDefinition[] = [
  {
    id: 'tam',
    labelKey: 'kpis.startup.tam',
    compute: ({ decision }) => ({
      id: 'tam',
      labelKey: 'kpis.startup.tam',
      value: decision.marketAnalysis?.result.tam ?? 0,
      unitKey: 'kpis.units.million',
    }),
  },
  {
    id: 'burnRate',
    labelKey: 'kpis.startup.burnRate',
    placeholder: true,
    compute: () => ({
      id: 'burnRate',
      labelKey: 'kpis.startup.burnRate',
      value: 42,
      unitKey: 'kpis.units.kPerMonth',
      placeholder: true,
    }),
  },
  {
    id: 'runway',
    labelKey: 'kpis.startup.runway',
    placeholder: true,
    compute: () => ({
      id: 'runway',
      labelKey: 'kpis.startup.runway',
      value: 14,
      unitKey: 'kpis.units.months',
      placeholder: true,
    }),
  },
  {
    id: 'pmfScore',
    labelKey: 'kpis.startup.pmfScore',
    compute: ({ decision, stats }) => ({
      id: 'pmfScore',
      labelKey: 'kpis.startup.pmfScore',
      value: Math.round(
        (decision.scores.executionReadiness + (stats.voc.total > 0 ? 15 : 0)) / 1.15,
      ),
      unitKey: 'kpis.units.score',
    }),
  },
];

const ENTERPRISE_KPIS: KpiDefinition[] = [
  {
    id: 'strategicFit',
    labelKey: 'kpis.enterprise.strategicFit',
    compute: ({ decision }) => ({
      id: 'strategicFit',
      labelKey: 'kpis.enterprise.strategicFit',
      value: decision.scores.decisionScore,
      unitKey: 'kpis.units.score',
    }),
  },
  {
    id: 'revenueImpact',
    labelKey: 'kpis.enterprise.revenueImpact',
    placeholder: true,
    compute: ({ decision }) => ({
      id: 'revenueImpact',
      labelKey: 'kpis.enterprise.revenueImpact',
      value: Math.round(decision.scores.decisionScore * 1.2),
      unitKey: 'kpis.units.million',
      placeholder: true,
    }),
  },
  {
    id: 'costSaving',
    labelKey: 'kpis.enterprise.costSaving',
    placeholder: true,
    compute: () => ({
      id: 'costSaving',
      labelKey: 'kpis.enterprise.costSaving',
      value: 8,
      unitKey: 'kpis.units.percent',
      placeholder: true,
    }),
  },
  {
    id: 'riskLevel',
    labelKey: 'kpis.enterprise.riskLevel',
    compute: ({ decision }) => ({
      id: 'riskLevel',
      labelKey: 'kpis.enterprise.riskLevel',
      value:
        decision.verdict === 'NO_GO' ? 82 : decision.verdict === 'HOLD' ? 58 : 34,
      unitKey: 'kpis.units.score',
      trend: decision.verdict === 'GO' ? 'down' : 'up',
    }),
  },
];

const AI_KPIS: KpiDefinition[] = [
  {
    id: 'aiReadiness',
    labelKey: 'kpis.ai.readiness',
    compute: ({ decision }) => ({
      id: 'aiReadiness',
      labelKey: 'kpis.ai.readiness',
      value: decision.scores.executionReadiness,
      unitKey: 'kpis.units.score',
    }),
  },
  {
    id: 'roi',
    labelKey: 'kpis.ai.roi',
    placeholder: true,
    compute: ({ decision }) => ({
      id: 'roi',
      labelKey: 'kpis.ai.roi',
      value: Math.round(decision.scores.investmentReadiness * 1.4),
      unitKey: 'kpis.units.percent',
      placeholder: true,
    }),
  },
  {
    id: 'automationPotential',
    labelKey: 'kpis.ai.automation',
    placeholder: true,
    compute: () => ({
      id: 'automationPotential',
      labelKey: 'kpis.ai.automation',
      value: 67,
      unitKey: 'kpis.units.percent',
      placeholder: true,
    }),
  },
  {
    id: 'dataMaturity',
    labelKey: 'kpis.ai.dataMaturity',
    compute: ({ stats, decision }) => ({
      id: 'dataMaturity',
      labelKey: 'kpis.ai.dataMaturity',
      value: Math.min(
        100,
        Math.round(
          stats.evidence.total * 8 +
            decision.explanation.evidenceCoverage.overallPercent * 0.4,
        ),
      ),
      unitKey: 'kpis.units.score',
    }),
  },
];

function selectRegistry(projectType: ProjectType): KpiDefinition[] {
  switch (projectType) {
    case 'BUSINESS_STRATEGY':
    case 'NEW_BUSINESS':
    case 'DIGITAL_TRANSFORMATION':
    case 'MARKET_EXPANSION':
      return ENTERPRISE_KPIS;
    case 'AI_INITIATIVE':
      return AI_KPIS;
    default:
      return STARTUP_KPIS;
  }
}

/** KPI Registry — project-type-specific executive KPIs. */
export function buildTypeKpis(
  projectType: ProjectType,
  stats: ProjectDashboardStats,
  decision: DecisionResult,
): ExecutiveKpiValue[] {
  const ctx: KpiContext = { stats, decision };
  return selectRegistry(projectType).map((def) => def.compute(ctx));
}

export function getKpiRegistryIds(projectType: ProjectType): string[] {
  return selectRegistry(projectType).map((d) => d.id);
}
