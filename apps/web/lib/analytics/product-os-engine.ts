import type { OpsDashboardStats } from './types';

export type ProductOsBrief = {
  primaryKpiKey: string;
  primaryKpiLabel: string;
  currentValue: number;
  unit: '%' | 'count';
  biggestDropStep: string;
  dropPercent: number;
  rootCause: string;
  hypothesis: string;
  experiment: string;
  measureBy: string;
  nextKpiKey: string;
  deployVersion: string;
  recommendation: string;
};

type DropPlaybookEntry = {
  kpiKey: string;
  kpiLabel: string;
  getValue: (kpis: NonNullable<OpsDashboardStats['productKpis']>) => number;
  rootCause: string;
  hypothesis: string;
  experiment: string;
  measureBy: string;
  nextKpiKey: string;
};

const DROP_PLAYBOOK: Record<string, DropPlaybookEntry> = {
  'landing → goal': {
    kpiKey: 'goalSelectionRate',
    kpiLabel: 'Goal Selection Rate',
    getValue: (k) => k.goalSelectionRate,
    rootCause: 'Service Understanding — Founder does not grasp AI PM value in 5 seconds',
    hypothesis: 'Hero copy and speed promise do not connect outcome to one-tap Goal',
    experiment: 'Strengthen outcome line + recommended Goal one-tap path on Landing/Goal',
    measureBy: 'goal_selected / landing_viewed',
    nextKpiKey: 'workflowCompletionRate',
  },
  'goal → workflow': {
    kpiKey: 'workflowCompletionRate',
    kpiLabel: 'Workflow Completion',
    getValue: (k) => k.workflowCompletionRate,
    rootCause: 'Thinking fatigue or unclear AI-designed workflow',
    hypothesis: 'Double thinking overlay or dense plan blocks "AI designed my project"',
    experiment: 'Skip redundant compose · surface Strategy Stack + Why above fold',
    measureBy: 'workflow_started / goal_selected',
    nextKpiKey: 'activationRate',
  },
  'workflow → workspace': {
    kpiKey: 'workflowCompletionRate',
    kpiLabel: 'Workflow Completion',
    getValue: (k) => k.workflowCompletionRate,
    rootCause: 'Workflow confirmation feels like homework before progress',
    hypothesis: 'Too much roadmap text before "start project" CTA',
    experiment: 'Single primary CTA · expected Confidence gain headline',
    measureBy: 'workspace_entered / workflow_started',
    nextKpiKey: 'projectStartRate',
  },
  'workspace → project': {
    kpiKey: 'projectStartRate',
    kpiLabel: 'Project Start Rate',
    getValue: (k) => k.projectStartRate,
    rootCause: 'Activation blocked — registration feels required and long',
    hypothesis: 'Multi-field form kills 30-second project start',
    experiment: 'One-line idea + AI auto-name + auto-save (verify drop falls)',
    measureBy: 'project_created / workspace_entered',
    nextKpiKey: 'decisionUnderstandingRate',
  },
  'project → analysis': {
    kpiKey: 'activationRate',
    kpiLabel: 'Activation',
    getValue: (k) => k.activationRate,
    rootCause: 'Wait after submit — analysis overlay without clear progress',
    hypothesis: 'Analysis duration feels like a black box',
    experiment: 'Shorter analysis steps · show Evidence preview during thinking',
    measureBy: 'analysis_started / project_created',
    nextKpiKey: 'decisionUnderstandingRate',
  },
  'analysis → decision': {
    kpiKey: 'decisionUnderstandingRate',
    kpiLabel: 'Decision Understanding',
    getValue: (k) => k.decisionUnderstandingRate,
    rootCause: 'AI Trust — HOLD without visible Evidence path',
    hypothesis: 'User does not see Why/Evidence before leaving',
    experiment: 'HOLD path + Intelligence auto-open + Missing Data chips',
    measureBy: 'decision_generated / project_created',
    nextKpiKey: 'goConversionRate',
  },
};

export function computeProductOsBrief(
  stats: Pick<
    OpsDashboardStats,
    'productKpis' | 'dropOffRates' | 'operationalMetrics' | 'productJourneyFunnel'
  >,
): ProductOsBrief | null {
  const kpis = stats.productKpis;
  const drops = stats.dropOffRates;
  if (!kpis || !drops?.length) return null;

  const worst = drops.reduce((max, row) => (row.dropPercent > max.dropPercent ? row : max), drops[0]!);
  const playbook = DROP_PLAYBOOK[worst.step] ?? DROP_PLAYBOOK['landing → goal']!;
  const version = stats.operationalMetrics?.version ?? 'local';

  return {
    primaryKpiKey: playbook.kpiKey,
    primaryKpiLabel: playbook.kpiLabel,
    currentValue: playbook.getValue(kpis),
    unit: '%',
    biggestDropStep: worst.step,
    dropPercent: worst.dropPercent,
    rootCause: playbook.rootCause,
    hypothesis: playbook.hypothesis,
    experiment: playbook.experiment,
    measureBy: playbook.measureBy,
    nextKpiKey: playbook.nextKpiKey,
    deployVersion: version,
    recommendation: `Drop ${worst.dropPercent}% at ${worst.step} — run experiment on ${playbook.kpiLabel}, then re-measure ${playbook.measureBy}.`,
  };
}
