import type { StrategyPipelineResult, StrategyVerdict } from '@repo/agents';

import { loadAgentPipelineResult, saveAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { loadLearningContext, saveLearningContext } from '@/lib/agents/learning-store';

import type { ActionWorkspaceResult } from '../components/founder-ai-pm/founder-action-workspace';
import { resolveStageIndex } from './founder-ai-pm-engine';
import {
  recordFounderActionCompleted,
  type FounderBehaviorProfile,
} from './founder-behavior-store';
import {
  appendFounderEvidence,
  loadFounderEvidence,
  synthesizeEvidenceFromAnswers,
} from './founder-evidence-store';
import type { BusinessProgressDimension, GeneratedTodayAction } from './founder-intelligence-engine';
import { loadFounderMemory, saveFounderMemory } from './founder-memory-store';
import {
  loadProjectOperatingState,
  resolveOperatingTimeline,
  saveProjectOperatingState,
  type ActionDebriefSnapshot,
  type FounderProjectOperatingState,
} from './founder-project-state-store';
import type { WorkflowGoalId } from '../types';

export type ActionCompletionContext = {
  projectId: string;
  goalId: WorkflowGoalId;
  confidence: number;
  scoreBefore: number;
};

export type ActionCompletionUpdateResult = {
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  verdictBefore: StrategyVerdict;
  verdictAfter: StrategyVerdict;
  evidenceSummary: string;
  insight: string;
  nextAction?: GeneratedTodayAction;
  debrief: ActionDebriefSnapshot;
  behavior: FounderBehaviorProfile | null;
  operatingState: FounderProjectOperatingState;
};

function boostProgress(
  progress: BusinessProgressDimension[],
  kind: string,
): BusinessProgressDimension[] {
  return progress.map((dim) => {
    let boost = 0;
    if (dim.key === 'customer' && (kind === 'interview' || kind === 'generic')) boost = 18;
    if (dim.key === 'pricing' && kind === 'pricing') boost = 22;
    if (dim.key === 'pricing' && kind === 'interview') boost = 8;
    if (dim.key === 'market' && kind === 'competitor') boost = 12;
    if (dim.key === 'customer' && kind === 'landing') boost = 10;
    if (dim.key === 'investment' && kind === 'interview') boost = 4;
    return { ...dim, percent: Math.min(100, dim.percent + boost) };
  });
}

function reevaluateVerdict(
  score: number,
  progress: BusinessProgressDimension[],
): StrategyVerdict {
  const customer = progress.find((d) => d.key === 'customer')?.percent ?? 0;
  const pricing = progress.find((d) => d.key === 'pricing')?.percent ?? 0;
  const market = progress.find((d) => d.key === 'market')?.percent ?? 0;

  if (score >= 80 && customer >= 55 && pricing >= 45 && market >= 60) return 'GO';
  if (score < 35 || market < 20) return 'NO_GO';
  if (customer < 30 && pricing < 20) return 'PIVOT';
  return 'HOLD';
}

function buildNextTodayActions(
  progress: BusinessProgressDimension[],
  completedActionId: string,
  pipeline: StrategyPipelineResult | null,
): GeneratedTodayAction[] {
  const fromPipeline = pipeline?.founderOs?.todayActions ?? [];
  const remaining = fromPipeline.filter((action) => action.id !== completedActionId);

  if (remaining.length >= 2) {
    return remaining.slice(0, 3).map((action, index) => ({
      id: action.id,
      title: action.title,
      etaMinutes: action.etaMinutes,
      goImpact: action.goImpact,
      order: index + 1,
    }));
  }

  const customer = progress.find((d) => d.key === 'customer')?.percent ?? 0;
  const pricing = progress.find((d) => d.key === 'pricing')?.percent ?? 0;
  const market = progress.find((d) => d.key === 'market')?.percent ?? 0;

  const actions: GeneratedTodayAction[] = [];

  if (pricing < 55) {
    actions.push({
      id: 'next-pricing',
      title: '잠재고객 5명 가격 검증 인터뷰',
      etaMinutes: 20,
      goImpact: 6,
      order: 1,
    });
  }
  if (customer < 60) {
    actions.push({
      id: 'next-customer',
      title: '잠재고객 3명 인터뷰',
      etaMinutes: 15,
      goImpact: 4,
      order: actions.length + 1,
    });
  }
  if (market < 75) {
    actions.push({
      id: 'next-competitor',
      title: '경쟁사 비교표 작성',
      etaMinutes: 10,
      goImpact: 3,
      order: actions.length + 1,
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: 'next-mvp',
      title: 'MVP 랜딩 페이지 체크리스트',
      etaMinutes: 12,
      goImpact: 5,
      order: 1,
    });
  }

  return actions.slice(0, 3);
}

function patchPipeline(
  pipeline: StrategyPipelineResult,
  params: {
    scoreAfter: number;
    scoreDelta: number;
    verdict: StrategyVerdict;
    confidence: number;
    progress: BusinessProgressDimension[];
    todayActions: GeneratedTodayAction[];
    completedActionId: string;
    insight: string;
    gap: string;
  },
): StrategyPipelineResult {
  const reasons = [
    ...(pipeline.founderOs?.successScore.reasons ?? pipeline.decision.reasons).slice(0, 2),
    params.insight,
  ];

  return {
    ...pipeline,
    decision: {
      ...pipeline.decision,
      verdict: params.verdict,
      confidence: params.confidence,
      missingData:
        params.verdict === 'GO'
          ? pipeline.decision.missingData.slice(1)
          : pipeline.decision.missingData,
      intelligence: {
        why: pipeline.decision.intelligence?.why ?? '실행 결과가 반영되었습니다.',
        gap: params.gap,
        gapSeverity: pipeline.decision.intelligence?.gapSeverity ?? 40,
        how: pipeline.decision.intelligence?.how ?? params.todayActions[0]?.title ?? '',
        etaMinutes: params.todayActions[0]?.etaMinutes ?? 15,
        expectedEffect: `+${params.todayActions[0]?.goImpact ?? 4}%`,
        goLift: params.todayActions[0]?.goImpact ?? 4,
        nextActionTitle: params.todayActions[0]?.title ?? '',
      },
    },
    founderOs: pipeline.founderOs
      ? {
          ...pipeline.founderOs,
          successScore: {
            percent: params.scoreAfter,
            delta: params.scoreDelta,
            reasons,
          },
          businessProgress: params.progress,
          todayActions: params.todayActions.map((action, index) => ({
            id: action.id,
            title: action.title ?? '오늘의 액션',
            etaMinutes: action.etaMinutes,
            goImpact: action.goImpact,
            order: index + 1,
          })),
          totalEtaMinutes: params.todayActions.reduce((sum, a) => sum + a.etaMinutes, 0),
          dailyReview: {
            scoreDelta: params.scoreDelta,
            advances: [params.insight],
            pending: params.verdict === 'GO' ? [] : [params.gap],
            tomorrowFocus: params.todayActions[0]?.title ?? '다음 검증',
            totalMinutesInvested: params.todayActions[0]?.etaMinutes ?? 15,
          },
        }
      : pipeline.founderOs,
    memory: {
      ...pipeline.memory,
      lastDecision: params.verdict,
      topGap: params.gap,
      completedActions: [
        ...(pipeline.memory.completedActions ?? []),
        params.completedActionId,
      ],
      weekInsight: params.insight,
    },
    growth: pipeline.growth?.metrics
      ? {
          ...pipeline.growth,
          metrics: {
            ...pipeline.growth.metrics,
            successScore: params.scoreAfter,
            successDelta: params.scoreDelta,
            businessProgress: {
              market: params.progress.find((d) => d.key === 'market')?.percent ?? 0,
              customer: params.progress.find((d) => d.key === 'customer')?.percent ?? 0,
              pricing: params.progress.find((d) => d.key === 'pricing')?.percent ?? 0,
              investment: params.progress.find((d) => d.key === 'investment')?.percent ?? 0,
            },
          },
        }
      : pipeline.growth,
  };
}

export function applyActionCompletionUpdate(
  ctx: ActionCompletionContext,
  result: ActionWorkspaceResult,
): ActionCompletionUpdateResult {
  const pipeline = loadAgentPipelineResult();
  const previousOperating = loadProjectOperatingState(ctx.projectId);
  const verdictBefore =
    previousOperating?.verdict ?? pipeline?.decision?.verdict ?? 'HOLD';

  const baseProgress =
    previousOperating?.businessProgress ??
    pipeline?.founderOs?.businessProgress ??
    ([
      { key: 'market', percent: 70 },
      { key: 'customer', percent: 30 },
      { key: 'pricing', percent: 15 },
      { key: 'investment', percent: 8 },
    ] as BusinessProgressDimension[]);

  const behavior = recordFounderActionCompleted(ctx.projectId, {
    actionId: result.actionId,
    title: result.title,
    kind: result.kind,
    completedAt: new Date().toISOString(),
    goImpact: result.goImpact,
    answerCount: result.answers.length,
  });

  const evidenceDraft = synthesizeEvidenceFromAnswers(
    result.actionId,
    result.kind,
    result.answers,
    result.goImpact,
  );
  const evidence = appendFounderEvidence(ctx.projectId, evidenceDraft);

  const scoreAfter = Math.min(
    100,
    Math.max(
      ctx.scoreBefore + result.goImpact,
      behavior?.scoreSnapshots[behavior.scoreSnapshots.length - 1]?.score ?? ctx.scoreBefore,
    ),
  );
  const scoreDelta = scoreAfter - ctx.scoreBefore;

  const businessProgress = boostProgress(baseProgress, result.kind);
  const verdictAfter = reevaluateVerdict(scoreAfter, businessProgress);
  const decisionConfidence = Math.min(100, Math.round((scoreAfter + (pipeline?.decision?.confidence ?? ctx.confidence)) / 2));
  const todayActions = buildNextTodayActions(businessProgress, result.actionId, pipeline);
  const nextAction = todayActions[0];
  const gap =
    verdictAfter === 'GO'
      ? '투자 설득 자료 정리'
      : businessProgress.find((d) => d.key === 'pricing')!.percent < 55
        ? '가격 검증'
        : businessProgress.find((d) => d.key === 'customer')!.percent < 50
          ? '고객 인터뷰'
          : '경쟁 차별화';

  const stageIndex = resolveStageIndex(decisionConfidence);
  const memory = loadFounderMemory(ctx.projectId);
  if (memory) {
    saveFounderMemory({
      ...memory,
      confidence: decisionConfidence,
      successScore: scoreAfter,
      stageIndex,
    });
  }

  if (pipeline) {
    saveAgentPipelineResult(
      patchPipeline(pipeline, {
        scoreAfter,
        scoreDelta,
        verdict: verdictAfter,
        confidence: decisionConfidence,
        progress: businessProgress,
        todayActions,
        completedActionId: result.actionId,
        insight: evidence.summary,
        gap,
      }),
    );
  }

  const learning = loadLearningContext(ctx.projectId);
  saveLearningContext({
    projectId: ctx.projectId,
    signals: [
      ...(learning?.signals ?? []),
      {
        signal: `${result.kind}_completed`,
        weight: result.goImpact,
        recommendation: evidence.summary,
      },
    ].slice(-12),
    lastSuccessScore: scoreAfter,
    updatedAt: new Date().toISOString(),
  });

  const debrief: ActionDebriefSnapshot = {
    actionTitle: result.title,
    actionKind: result.kind,
    scoreBefore: ctx.scoreBefore,
    scoreAfter,
    scoreDelta,
    insight: evidence.insight,
    evidenceSummary: evidence.summary,
    verdictBefore,
    verdictAfter,
    nextActionTitle: nextAction?.title,
    nextActionMinutes: nextAction?.etaMinutes,
    nextActionImpact: nextAction?.goImpact,
    completedAt: new Date().toISOString(),
  };

  const operatingState: FounderProjectOperatingState = {
    projectId: ctx.projectId,
    successScore: scoreAfter,
    verdict: verdictAfter,
    decisionConfidence,
    businessProgress,
    todayActions,
    evidence: [evidence, ...loadFounderEvidence(ctx.projectId)].slice(0, 10),
    timeline: resolveOperatingTimeline(businessProgress, verdictAfter),
    lastDebrief: debrief,
    updatedAt: new Date().toISOString(),
  };

  saveProjectOperatingState(operatingState);

  return {
    scoreBefore: ctx.scoreBefore,
    scoreAfter,
    scoreDelta,
    verdictBefore,
    verdictAfter,
    evidenceSummary: evidence.summary,
    insight: evidence.insight,
    nextAction,
    debrief,
    behavior,
    operatingState,
  };
}
