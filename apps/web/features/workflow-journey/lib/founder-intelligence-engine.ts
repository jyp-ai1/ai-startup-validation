import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { getDecisionStages } from '../constants/decision-experience';
import type { WorkflowGoalId } from '../types';
import {
  computeFounderOperatingBrief,
  resolveStageIndex,
  type FounderOperatingBrief,
} from './founder-ai-pm-engine';
import { syncFounderMemoryOnVisit, type FounderMemoryRecall } from './founder-memory-store';

export type BusinessDeltaItem = {
  id: string;
  category: 'market' | 'competitor' | 'investment' | 'government';
  textKey: string;
  params?: Record<string, string | number>;
};

export type DecisionIntelligencePath = {
  whyKey: string;
  whyParams: Record<string, string | number>;
  howKey: string;
  howParams: Record<string, string | number>;
  whenKey: string;
  whenParams: Record<string, string | number>;
  confidenceFrom: number;
  confidenceTo: number;
  goFrom: number;
  goTo: number;
  etaDays: number;
};

export type ExecutionRoadmapItem = {
  horizon: 'today' | 'week' | 'month' | 'quarter' | 'investment';
  title: string;
  etaMinutes: number;
  confidenceImpact: number;
  completionCriteriaKey: string;
};

export type GrowthPathItem = {
  id: string;
  phaseKey: string;
  title: string;
  etaWeeks: number;
  status: 'current' | 'upcoming' | 'done';
};

export type FounderIntelligenceBrief = {
  operating: FounderOperatingBrief;
  memoryRecall: FounderMemoryRecall;
  businessDeltas: BusinessDeltaItem[];
  decisionPath: DecisionIntelligencePath;
  executionRoadmap: ExecutionRoadmapItem[];
  growthPath: GrowthPathItem[];
  showGrowth: boolean;
};

const WHY_KEYS = ['marketGap', 'competitorGap', 'vocGap', 'goReady'] as const;
const HOW_KEYS = ['marketResearch', 'competitorDeepDive', 'pricingInterview', 'mvpLaunch'] as const;
const WHEN_DAYS = [7, 10, 14, 21] as const;

function buildBusinessDeltas(stageIndex: number): BusinessDeltaItem[] {
  const pipeline = loadAgentPipelineResult();
  const deltas: BusinessDeltaItem[] = [];

  if (pipeline?.research) {
    const trend = pipeline.research.findings.find((f) => f.domain === 'trend');
    const competitor = pipeline.research.findings.find((f) => f.domain === 'competitor');
    const investment = pipeline.research.findings.find((f) => f.domain === 'investment');
    const government = pipeline.research.findings.find((f) => f.domain === 'government');

    if (trend) {
      deltas.push({
        id: 'market-trend',
        category: 'market',
        textKey: 'aiMarketInvestment',
        params: { count: 3 },
      });
    }
    if (competitor) {
      deltas.push({
        id: 'competitor-price',
        category: 'competitor',
        textKey: 'competitorPricing',
        params: { name: 'Notion AI' },
      });
    }
    if (investment) {
      deltas.push({
        id: 'investment-flow',
        category: 'investment',
        textKey: 'seedActivity',
        params: { count: 2 },
      });
    }
    if (government) {
      deltas.push({
        id: 'grant-new',
        category: 'government',
        textKey: 'grantPosted',
        params: { program: 'TIPS' },
      });
    }
  }

  if (deltas.length > 0) return deltas.slice(0, 4);

  const fallback: BusinessDeltaItem[] = [
    { id: 'm1', category: 'market', textKey: 'aiMarketInvestment', params: { count: 3 } },
    { id: 'm2', category: 'competitor', textKey: 'competitorPricing', params: { name: 'Notion AI' } },
    { id: 'm3', category: 'investment', textKey: 'seedActivity', params: { count: 2 } },
  ];
  if (stageIndex >= 2) {
    fallback.push({ id: 'm4', category: 'government', textKey: 'grantPosted', params: { program: 'TIPS' } });
  }
  return fallback;
}

function buildDecisionPath(
  goalId: WorkflowGoalId,
  stageIndex: number,
  confidence: number,
): DecisionIntelligencePath {
  const stages = getDecisionStages(goalId);
  const stage = stages[stageIndex] ?? stages[0]!;
  const pipeline = loadAgentPipelineResult();
  const gain = stageIndex === 2 ? 13 : 10;
  const goGain = stageIndex === 2 ? 22 : 15;
  const after = Math.min(100, confidence + gain);
  const goAfter = Math.min(100, confidence + goGain);

  return {
    whyKey: WHY_KEYS[stageIndex] ?? 'vocGap',
    whyParams: {
      verdict: pipeline?.decision?.verdict ?? stage.verdict,
      gap: pipeline?.decision?.missingData?.[0] ?? stage.primaryHoldReasonKey ?? 'voc',
    },
    howKey: HOW_KEYS[stageIndex] ?? 'pricingInterview',
    howParams: { action: stage.nextActionStepId },
    whenKey: stageIndex >= 3 ? 'goNow' : 'beforeGo',
    whenParams: { days: WHEN_DAYS[stageIndex] ?? 14 },
    confidenceFrom: confidence,
    confidenceTo: after,
    goFrom: confidence,
    goTo: goAfter,
    etaDays: WHEN_DAYS[stageIndex] ?? 14,
  };
}

function buildExecutionRoadmap(stageIndex: number): ExecutionRoadmapItem[] {
  const pipeline = loadAgentPipelineResult();
  const horizonMap: Record<string, ExecutionRoadmapItem['horizon']> = {
    today: 'today',
    week: 'week',
    month: 'month',
  };

  const fromPipeline =
    pipeline?.execution?.tasks.map((task) => ({
      horizon: horizonMap[task.horizon] ?? 'week',
      title: task.title,
      etaMinutes: task.etaMinutes,
      confidenceImpact: task.confidenceImpact,
      completionCriteriaKey: task.priority === 'P0' ? 'evidenceLogged' : 'reviewComplete',
    })) ?? [];

  const quarter: ExecutionRoadmapItem = {
    horizon: 'quarter',
    title:
      stageIndex >= 3
        ? 'Beta launch + first paying customers'
        : 'GO decision + MVP scope lock',
    etaMinutes: 2400,
    confidenceImpact: 18,
    completionCriteriaKey: 'milestoneComplete',
  };

  const investment: ExecutionRoadmapItem = {
    horizon: 'investment',
    title: 'Seed deck + IR narrative from validated metrics',
    etaMinutes: 3600,
    confidenceImpact: 12,
    completionCriteriaKey: 'investorReady',
  };

  return [...fromPipeline, quarter, investment];
}

function buildGrowthPath(stageIndex: number): GrowthPathItem[] {
  const pipeline = loadAgentPipelineResult();
  const milestones = pipeline?.growth?.milestones ?? [];

  const titles =
    milestones.length > 0
      ? milestones.map((m) => ({ phase: m.phase, title: m.title, etaWeeks: m.etaWeeks }))
      : [
          { phase: 'mvp' as const, title: 'MVP scope lock + build', etaWeeks: 2 },
          { phase: 'interview' as const, title: '10 ICP customer interviews', etaWeeks: 3 },
          { phase: 'landing' as const, title: 'Landing + waitlist launch', etaWeeks: 4 },
          { phase: 'marketing' as const, title: 'Founder community GTM', etaWeeks: 5 },
          { phase: 'funding' as const, title: 'Seed round preparation', etaWeeks: 8 },
        ];

  return titles.map((item, index) => ({
    id: `growth-${index}`,
    phaseKey: item.phase,
    title: item.title,
    etaWeeks: item.etaWeeks,
    status: index < stageIndex - 1 ? 'done' : index === stageIndex - 1 ? 'current' : 'upcoming',
  }));
}

export function computeFounderIntelligenceBrief(
  projectId: string,
  goalId: WorkflowGoalId,
  confidence: number,
): FounderIntelligenceBrief {
  const stageIndex = resolveStageIndex(confidence);
  const operating = computeFounderOperatingBrief(goalId, confidence);
  const memoryRecall = syncFounderMemoryOnVisit(projectId, stageIndex, confidence);
  const pipeline = loadAgentPipelineResult();
  const verdict = pipeline?.decision?.verdict;
  const showGrowth = stageIndex >= 2 || verdict === 'GO';

  return {
    operating,
    memoryRecall,
    businessDeltas: buildBusinessDeltas(stageIndex),
    decisionPath: buildDecisionPath(goalId, stageIndex, confidence),
    executionRoadmap: buildExecutionRoadmap(stageIndex),
    growthPath: buildGrowthPath(stageIndex),
    showGrowth,
  };
}
