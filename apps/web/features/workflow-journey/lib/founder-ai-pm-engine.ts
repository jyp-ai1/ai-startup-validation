import type { DecisionStage } from '../constants/decision-experience';
import {
  CONFIDENCE_TIMELINE,
  getEvidenceThoughtSteps,
  getStageConfidenceBreakdown,
  getStageWhatIf,
} from '../constants/decision-experience';

/** Founder-facing AI PM brief — separate from Admin Product OS engine. */
export type FounderAiPmBrief = {
  summaryKey: string;
  summaryParams: Record<string, string | number>;
  confidenceBreakdown: ReturnType<typeof getStageConfidenceBreakdown>;
  evidenceThoughtSteps: ReturnType<typeof getEvidenceThoughtSteps>;
  whatIf: ReturnType<typeof getStageWhatIf>;
  nextAction: {
    durationMinutes: number;
    confidenceGain: number;
    goProbabilityGain: number;
    priority: 'P0' | 'P1' | 'P2';
  };
  todayFocus: string;
};

const SUMMARY_KEYS: Record<string, string> = {
  marketSizeUnknown: 'marketGap',
  noCompetitorAnalysis: 'competitorGap',
  insufficientInterviews: 'vocGap',
  go: 'goReady',
};

const GO_PROBABILITY_GAINS = [12, 15, 24, 0] as const;

export function computeFounderAiPmBrief(stage: DecisionStage, stageIndex: number): FounderAiPmBrief {
  const timelineStep = CONFIDENCE_TIMELINE[stageIndex];
  const confidenceGain = timelineStep?.gain ?? 0;
  const goProbabilityGain = GO_PROBABILITY_GAINS[stageIndex] ?? 0;
  const primaryKey = stage.primaryHoldReasonKey ?? 'go';
  const summaryKey = SUMMARY_KEYS[primaryKey] ?? 'vocGap';

  const nextConfidence =
    stageIndex < CONFIDENCE_TIMELINE.length
      ? CONFIDENCE_TIMELINE[stageIndex]?.to ?? stage.confidence
      : stage.confidence;

  return {
    summaryKey,
    summaryParams: {
      current: stage.confidence,
      after: nextConfidence,
      gain: confidenceGain,
      interviews: stageIndex === 2 ? 3 : 2,
    },
    confidenceBreakdown: getStageConfidenceBreakdown(stageIndex),
    evidenceThoughtSteps: getEvidenceThoughtSteps(stageIndex, stage.verdict),
    whatIf: getStageWhatIf(stageIndex, stage.confidence),
    nextAction: {
      durationMinutes: stage.nextActionDurationMinutes,
      confidenceGain,
      goProbabilityGain,
      priority: stageIndex === 2 ? 'P0' : stageIndex === 0 ? 'P1' : 'P1',
    },
    todayFocus: stage.nextActionStepId,
  };
}
