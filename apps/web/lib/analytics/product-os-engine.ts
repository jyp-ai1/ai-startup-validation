import { resolveExperimentImpact } from './experiment-tracker';
import type { AiPmRecommendation, OpsDashboardStats, ProductOsBrief } from './types';

export type { ProductOsBrief, AiPmRecommendation };

type DropPlaybookEntry = {
  kpiKey: string;
  kpiLabel: string;
  getValue: (kpis: NonNullable<OpsDashboardStats['productKpis']>) => number;
  rootCause: string;
  hypothesis: string;
  experiment: string;
  measureBy: string;
  nextKpiKey: string;
  expectedLift: number;
  estimatedHours: string;
  risk: 'low' | 'medium' | 'high';
  whyImportant: string;
};

const DROP_PLAYBOOK: Record<string, DropPlaybookEntry> = {
  'landing → goal': {
    kpiKey: 'goalSelectionRate',
    kpiLabel: 'Goal Selection Rate',
    getValue: (k) => k.goalSelectionRate,
    rootCause: 'Service Understanding — Founder does not grasp AI PM in 5 seconds',
    hypothesis: 'Outcome line before CTA is weak',
    experiment: 'Speed promise + recommended Goal one-tap',
    measureBy: 'goal_selected / landing_viewed',
    nextKpiKey: 'workflowCompletionRate',
    expectedLift: 10,
    estimatedHours: '2-3h',
    risk: 'low',
    whyImportant: 'Without Goal selection, no Workflow or Decision exists',
  },
  'goal → workflow': {
    kpiKey: 'workflowCompletionRate',
    kpiLabel: 'Workflow Completion',
    getValue: (k) => k.workflowCompletionRate,
    rootCause: 'Thinking fatigue after Goal',
    hypothesis: 'Double overlay blocks "AI designed my project"',
    experiment: 'Remove redundant compose · tighten plan CTA',
    measureBy: 'workflow_started / goal_selected',
    nextKpiKey: 'activationRate',
    expectedLift: 8,
    estimatedHours: '3-4h',
    risk: 'low',
    whyImportant: 'Workflow is the trust moment that AI composed a strategy',
  },
  'workflow → workspace': {
    kpiKey: 'workflowCompletionRate',
    kpiLabel: 'Workflow Completion',
    getValue: (k) => k.workflowCompletionRate,
    rootCause: 'Confirmation screen feels like homework',
    hypothesis: 'Too much text before start',
    experiment: 'Single CTA · Confidence gain headline only',
    measureBy: 'workspace_entered / workflow_started',
    nextKpiKey: 'projectStartRate',
    expectedLift: 6,
    estimatedHours: '2h',
    risk: 'low',
    whyImportant: 'Workspace entry unlocks daily Founder OS',
  },
  'workspace → project': {
    kpiKey: 'projectStartRate',
    kpiLabel: 'Project Start Rate',
    getValue: (k) => k.projectStartRate,
    rootCause: 'Activation blocked at registration',
    hypothesis: 'Multi-field form kills 30-second start',
    experiment: 'One-line idea · AI auto-name · auto-save',
    measureBy: 'project_created / workspace_entered',
    nextKpiKey: 'decisionUnderstandingRate',
    expectedLift: 12,
    estimatedHours: '4-6h',
    risk: 'medium',
    whyImportant: 'No project = no Decision, GO, or Execution',
  },
  'project → analysis': {
    kpiKey: 'activationRate',
    kpiLabel: 'Activation',
    getValue: (k) => k.activationRate,
    rootCause: 'Analysis wait feels like black box',
    hypothesis: 'Long overlay without Evidence preview',
    experiment: 'Shorter analysis · Evidence teaser during thinking',
    measureBy: 'analysis_started / project_created',
    nextKpiKey: 'decisionUnderstandingRate',
    expectedLift: 7,
    estimatedHours: '3h',
    risk: 'low',
    whyImportant: 'Activation is first proof AI is working on their business',
  },
  'analysis → decision': {
    kpiKey: 'decisionUnderstandingRate',
    kpiLabel: 'Decision Understanding',
    getValue: (k) => k.decisionUnderstandingRate,
    rootCause: 'HOLD without 3-second clarity — Founder does not see why or what to do next',
    hypothesis: 'AI Summary + Confidence Breakdown + What If + action rewards increase trust',
    experiment: 'Founder AI PM — Summary · Evidence Timeline · Breakdown · What If · Next Action rewards',
    measureBy: 'hold_path_viewed / decision_generated',
    nextKpiKey: 'goConversionRate',
    expectedLift: 15,
    estimatedHours: '4-6h',
    risk: 'low',
    whyImportant: 'Decision is the North Star — GO/HOLD must land in 3 seconds',
  },
  'project → analysis completed': {
    kpiKey: 'analysisCompletionRate',
    kpiLabel: 'Analysis Completion',
    getValue: (k) => k.analysisCompletionRate,
    rootCause: 'Thinking overlay hang or pipeline timeout — Founder never reaches Today',
    hypothesis: 'Timeout/retry/recovery not surfacing — overlay exits before analysis_completed',
    experiment: 'Verify agent_pipeline_* · overlay only exits on success or explicit retry',
    measureBy: 'analysis_completed / analysis_started',
    nextKpiKey: 'firstActionRate',
    expectedLift: 8,
    estimatedHours: '2h',
    risk: 'low',
    whyImportant: 'No analysis completion = no Today Hero, no first action',
  },
  'analysis → today hero': {
    kpiKey: 'analysisCompletionRate',
    kpiLabel: 'Analysis → Workspace',
    getValue: (k) => k.analysisCompletionRate,
    rootCause: 'Analysis completes but Workspace Today not reached',
    hypothesis: 'Phase transition bug or registration lost on refresh',
    experiment: 'sessionStorage recovery · analysis_completed → workspace_entered guard',
    measureBy: 'workspace_entered / analysis_completed',
    nextKpiKey: 'firstActionRate',
    expectedLift: 6,
    estimatedHours: '2-3h',
    risk: 'low',
    whyImportant: 'Today Hero is the daily operating entry point',
  },
  'hero → first action': {
    kpiKey: 'firstActionRate',
    kpiLabel: 'First Action Start',
    getValue: (k) => k.firstActionRate,
    rootCause: 'Today Hero CTA weak or Decision shown before action',
    hypothesis: 'Hero not dominant enough — Founder reads verdict instead of starting',
    experiment: 'Action-first Today · hero CTA · collapsed Decision/Evidence',
    measureBy: 'next_action_started / project_created',
    nextKpiKey: 'executionStartRate',
    expectedLift: 12,
    estimatedHours: '3-4h',
    risk: 'low',
    whyImportant: 'First action proves AI PM is co-founder, not a report',
  },
};

function computeHealthScore(kpis: NonNullable<OpsDashboardStats['productKpis']>): number {
  const weights = [
    kpis.goalSelectionRate * 0.15,
    kpis.activationRate * 0.2,
    kpis.decisionUnderstandingRate * 0.2,
    kpis.goConversionRate * 0.15,
    kpis.executionStartRate * 0.1,
    kpis.aiTrustRate * 0.1,
    kpis.feedbackScore * 0.1,
  ];
  return Math.min(100, Math.round(weights.reduce((a, b) => a + b, 0)));
}

function priorityFromDrop(dropPercent: number): 'P0' | 'P1' | 'P2' {
  if (dropPercent >= 50) return 'P0';
  if (dropPercent >= 25) return 'P1';
  return 'P2';
}

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
  const currentValue = playbook.getValue(kpis);
  const impactRaw = resolveExperimentImpact(playbook.kpiKey, currentValue);

  const nextPlaybook =
    DROP_PLAYBOOK[
      Object.keys(DROP_PLAYBOOK).find((step) => {
        const entry = DROP_PLAYBOOK[step]!;
        return entry.kpiKey === playbook.nextKpiKey;
      }) ?? worst.step
    ] ?? playbook;

  const impact = impactRaw
    ? {
        baselineValue: impactRaw.baselineValue,
        currentValue: impactRaw.currentValue,
        delta: impactRaw.delta,
        deltaLabel: impactRaw.deltaLabel,
        expectedLift: impactRaw.expectedLift,
        experimentName: impactRaw.experimentName,
        status: impactRaw.status,
        adopt: impactRaw.adopt,
        rollback: impactRaw.rollback,
      }
    : null;

  const aiPm: AiPmRecommendation = {
    priority: priorityFromDrop(worst.dropPercent),
    todayProblem: `${playbook.kpiLabel} · −${worst.dropPercent}% at ${worst.step}`,
    whyImportant: playbook.whyImportant,
    recommendedExperiment: impact?.rollback
      ? `Rollback ${impact.experimentName} · retry: ${playbook.experiment}`
      : playbook.experiment,
    expectedLift: impact?.rollback
      ? 'Revert and re-test'
      : `+${playbook.expectedLift}% (target)`,
    estimatedHours: playbook.estimatedHours,
    risk: playbook.risk,
  };

  let recommendation = `Drop ${worst.dropPercent}% at ${worst.step} — experiment on ${playbook.kpiLabel}.`;
  if (impact?.adopt) {
    recommendation = `${impact.experimentName} adopted — impact ${impact.deltaLabel}. Next: ${playbook.nextKpiKey}.`;
  } else if (impact?.rollback) {
    recommendation = `${impact.experimentName} hurt KPI (${impact.deltaLabel}) — rollback and run: ${playbook.experiment}.`;
  } else if (impact) {
    recommendation = `${impact.experimentName} measuring — ${impact.baselineValue}% → ${impact.currentValue}% (${impact.deltaLabel}). Keep watching ${playbook.measureBy}.`;
  }

  return {
    primaryKpiKey: playbook.kpiKey,
    primaryKpiLabel: playbook.kpiLabel,
    currentValue,
    unit: '%',
    biggestDropStep: worst.step,
    dropPercent: worst.dropPercent,
    rootCause: playbook.rootCause,
    hypothesis: playbook.hypothesis,
    experiment: playbook.experiment,
    measureBy: playbook.measureBy,
    nextKpiKey: playbook.nextKpiKey,
    deployVersion: version,
    recommendation,
    impact,
    aiPm,
    nextExperiment: nextPlaybook.experiment,
    productHealthScore: computeHealthScore(kpis),
  };
}
