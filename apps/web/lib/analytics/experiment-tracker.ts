/** Shipped experiments — baseline for impact / adopt / rollback (no LLM). */

export type ExperimentStatus = 'measuring' | 'adopted' | 'rolled_back' | 'active';

export type ExperimentRecord = {
  id: string;
  kpiKey: string;
  kpiLabel: string;
  name: string;
  hypothesis: string;
  baselineValue: number;
  expectedLift: number;
  deployVersion: string;
  status: ExperimentStatus;
  startedAt: string;
};

/** Known Closed Beta experiments (update when shipping). */
export const SHIPPED_EXPERIMENTS: ExperimentRecord[] = [
  {
    id: 'exp-one-line-registration',
    kpiKey: 'projectStartRate',
    kpiLabel: 'Project Start Rate',
    name: 'One-line idea + AI auto-name',
    hypothesis: 'Multi-field registration blocks 30-second project start',
    baselineValue: 23,
    expectedLift: 12,
    deployVersion: '5e32e04',
    status: 'adopted',
    startedAt: '2026-07-26T00:00:00.000Z',
  },
  {
    id: 'exp-founder-ai-pm',
    kpiKey: 'decisionUnderstandingRate',
    kpiLabel: 'Decision Understanding',
    name: 'Founder AI PM — Summary · Breakdown · What If · Next Action rewards',
    hypothesis: 'HOLD without 3-second clarity and action rewards causes drop-off',
    baselineValue: 35,
    expectedLift: 15,
    deployVersion: 'pending',
    status: 'active',
    startedAt: '2026-07-26T03:00:00.000Z',
  },
  {
    id: 'exp-hold-path',
    kpiKey: 'aiTrustRate',
    kpiLabel: 'AI Trust',
    name: 'HOLD path + Intelligence auto-open',
    hypothesis: 'Users leave HOLD without seeing Evidence',
    baselineValue: 45,
    expectedLift: 15,
    deployVersion: '883126a',
    status: 'adopted',
    startedAt: '2026-07-26T00:00:00.000Z',
  },
  {
    id: 'exp-goal-speed-promise',
    kpiKey: 'goalSelectionRate',
    kpiLabel: 'Goal Selection Rate',
    name: 'Landing speed promise + one-tap Goal',
    hypothesis: 'Founders do not see outcome before CTA',
    baselineValue: 42,
    expectedLift: 10,
    deployVersion: '087fe6d',
    status: 'adopted',
    startedAt: '2026-07-26T00:00:00.000Z',
  },
  {
    id: 'exp-hero-copy-v1',
    kpiKey: 'goalSelectionRate',
    kpiLabel: 'Goal Selection Rate',
    name: 'Negation-first hero copy',
    hypothesis: 'What-we-are-not copy improves understanding',
    baselineValue: 48,
    expectedLift: 5,
    deployVersion: 'pre-087fe6d',
    status: 'rolled_back',
    startedAt: '2026-07-25T00:00:00.000Z',
  },
];

export type ExperimentImpact = {
  experimentId: string;
  experimentName: string;
  kpiKey: string;
  kpiLabel: string;
  baselineValue: number;
  currentValue: number;
  delta: number;
  deltaLabel: string;
  expectedLift: number;
  status: ExperimentStatus;
  adopt: boolean;
  rollback: boolean;
  deployVersion: string;
};

const ADOPT_THRESHOLD = 3;
const ROLLBACK_THRESHOLD = -2;

export function resolveExperimentImpact(
  kpiKey: string,
  currentValue: number,
): ExperimentImpact | null {
  const candidates = SHIPPED_EXPERIMENTS.filter((e) => e.kpiKey === kpiKey);
  const active =
    candidates.find((e) => e.status === 'measuring' || e.status === 'active') ??
    candidates.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (!active) return null;

  const delta = currentValue - active.baselineValue;
  let status: ExperimentStatus = active.status;
  let adopt = false;
  let rollback = false;

  if (active.status === 'measuring' || active.status === 'active') {
    if (delta >= ADOPT_THRESHOLD) {
      status = 'adopted';
      adopt = true;
    } else if (delta <= ROLLBACK_THRESHOLD) {
      status = 'rolled_back';
      rollback = true;
    } else {
      status = 'measuring';
    }
  } else {
    adopt = active.status === 'adopted';
    rollback = active.status === 'rolled_back';
    status = active.status;
  }

  const sign = delta >= 0 ? '+' : '';
  return {
    experimentId: active.id,
    experimentName: active.name,
    kpiKey: active.kpiKey,
    kpiLabel: active.kpiLabel,
    baselineValue: active.baselineValue,
    currentValue,
    delta,
    deltaLabel: `${sign}${delta}%`,
    expectedLift: active.expectedLift,
    status,
    adopt,
    rollback,
    deployVersion: active.deployVersion,
  };
}

export function getRollbackHistory(): ExperimentRecord[] {
  return SHIPPED_EXPERIMENTS.filter((e) => e.status === 'rolled_back');
}

export function getExperimentBacklog(): ExperimentRecord[] {
  return SHIPPED_EXPERIMENTS.filter((e) => e.status === 'measuring' || e.status === 'active');
}

export function getActiveExperiments(): ExperimentRecord[] {
  return SHIPPED_EXPERIMENTS.filter((e) => e.status === 'active' || e.status === 'measuring');
}

export function getCompletedExperiments(): ExperimentRecord[] {
  return SHIPPED_EXPERIMENTS.filter((e) => e.status === 'adopted');
}

export function getFailedExperiments(): ExperimentRecord[] {
  return SHIPPED_EXPERIMENTS.filter((e) => e.status === 'rolled_back');
}

export type KpiTrendPoint = {
  kpiLabel: string;
  days7: number;
  days30: number;
};

export type AiPriorityItem = {
  priority: 'P0' | 'P1' | 'P2';
  kpi: string;
  action: string;
};

const KPI_TREND_MOCK: KpiTrendPoint[] = [
  { kpiLabel: 'Decision Understanding', days7: 38, days30: 35 },
  { kpiLabel: 'Project Start Rate', days7: 40, days30: 23 },
  { kpiLabel: 'Goal Selection Rate', days7: 58, days30: 42 },
  { kpiLabel: 'GO Conversion', days7: 12, days30: 8 },
];

const AI_PRIORITY_QUEUE: AiPriorityItem[] = [
  {
    priority: 'P0',
    kpi: 'Decision Understanding',
    action: 'Founder AI PM — 3-second HOLD clarity + What If + action rewards',
  },
  {
    priority: 'P1',
    kpi: 'GO Conversion',
    action: 'Next Action execution bridge after Decision Understanding',
  },
  {
    priority: 'P2',
    kpi: 'Retention',
    action: 'Daily AI PM brief on workspace Today tab',
  },
];

export function getKpiTrends(): KpiTrendPoint[] {
  return KPI_TREND_MOCK;
}

export function getAiPriorityQueue(): AiPriorityItem[] {
  return AI_PRIORITY_QUEUE;
}
